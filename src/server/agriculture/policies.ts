import "server-only";
import { getAccountContext } from "@/server/auth/context";
import { PublicError, requireConfig } from "@/server/auth/http";
import { getPrisma } from "@/server/db/prisma";

export async function requireActor(role: "FARMER" | "OPERATIONS") {
  requireConfig();
  const ctx = await getAccountContext();
  if (!ctx) throw new PublicError(401, "Please sign in to continue.");
  if (ctx.account.status !== "ACTIVE") throw new PublicError(403, "Your account is not active.");
  if (!ctx.user.email_confirmed_at) throw new PublicError(403, "Verify your email to continue.");
  if (role === "FARMER") {
    if (ctx.account.role !== "FARMER") throw new PublicError(403, "Farmer access required.");
    if (!ctx.user.phone_confirmed_at || ctx.user.phone !== ctx.account.phone)
      throw new PublicError(403, "Verify your phone number to continue.");
  } else if (!(["OPERATIONS", "SUPER_ADMIN"] as string[]).includes(ctx.account.role)) {
    throw new PublicError(403, "Operations access required.");
  }
  return { ...ctx, db: getPrisma() };
}

