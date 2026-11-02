import "server-only";
import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { PublicError } from "./http";
import type { z } from "zod";
import type { signupSchema } from "./validators";

/** This random, server-created ID is an opaque lookup, NEVER a source of role/permission claims. */
export const SIGNUP_INTENT_METADATA_KEY = "smarthub_signup_intent";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SignupInput = z.output<typeof signupSchema>;
export async function createSignupIntent(input: SignupInput) {
  const id = randomUUID();
  await getPrisma().signupIntent.create({ data: {
    id, email:input.email, role:input.role === "farmer" ? "FARMER" : "BUYER",
    fullName:input.fullName, phone:input.phone,
    farmName:input.role === "farmer" ? input.farmName || null : null,
    state:input.role === "farmer" ? input.state || null : null,
    expiresAt:new Date(Date.now() + SEVEN_DAYS_MS),
  }});
  return id;
}

/**
 * Idempotent reconciliation after Supabase has confirmed email ownership.
 * Only authoritative DB fields become account fields; editable Auth metadata
 * is never copied into role, phone, name, verification or status.
 * Any staff invite identity without a server-issued signup intent stays unprovisioned.
 */
export async function reconcilePublicAccount(user: User, db: PrismaClient = getPrisma()) {
  if (!user.email || !user.email_confirmed_at) return null;
  const existing = await db.account.findUnique({where:{id:user.id}});
  if (existing) return existing;
  const intentId = user.user_metadata?.[SIGNUP_INTENT_METADATA_KEY];
  if (typeof intentId !== "string" || !UUID_RE.test(intentId)) return null;
  const email = user.email.toLowerCase();
  const intent = await db.signupIntent.findFirst({where:{
    id:intentId, email, consumedAt:null, expiresAt:{gt:new Date()},
    OR:[{authUserId:null},{authUserId:user.id}],
  }});
  if (!intent || !["BUYER", "FARMER"].includes(intent.role)) return null;
  if (intent.role === "FARMER" && (!intent.farmName || !intent.state)) return null;
  try {
    return await db.$transaction(async tx => {
      const claimed = await tx.signupIntent.updateMany({where:{
        id:intent.id, consumedAt:null, email, expiresAt:{gt:new Date()},
        OR:[{authUserId:null},{authUserId:user.id}],
      },data:{authUserId:user.id,consumedAt:new Date()}});
      if (claimed.count !== 1) throw new PublicError(409,"Registration was already processed. Sign in again.");
      const account = await tx.account.create({data:{
        id:user.id, role:intent.role, email, fullName:intent.fullName, phone:intent.phone,
        farmName:intent.farmName, state:intent.state,
      }});
      await tx.auditEvent.create({data:{actorId:user.id,action:"PUBLIC_SIGNUP_PROVISIONED"}});
      return account;
    });
  } catch (error) {
    // A concurrent callback can win the unique account insert. Never overwrite its role.
    const already = await db.account.findUnique({where:{id:user.id}});
    if (already) return already;
    console.error("Registration reconciliation failed",error instanceof Error ? error.name : "unknown");
    throw new PublicError(503,"Account setup is pending. Please retry signing in or contact support.");
  }
}
