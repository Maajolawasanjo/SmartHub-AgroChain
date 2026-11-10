import "server-only";
import { assertRuntimeDatabaseTarget } from "@/server/db/runtime-target";

// Login, recovery and account APIs must not contact one Supabase Auth tenant
// while the Prisma connection points at another. Unlike mere URL presence,
// the shared DB guard verifies project identity, TLS, pooler and Vercel context.
export function authConfigReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const db = process.env.DATABASE_URL;
  const appUrl = process.env.APP_BASE_URL;
  const secret = process.env.AUTH_RECOVERY_SECRET;
  if (!url || !key || !db || !appUrl || !secret || secret.length<32) return false;
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const app = new URL(appUrl);
    const supabase = new URL(url);
    if (app.username || app.password || app.search || app.hash || app.pathname!=="/" ||
      supabase.username || supabase.password || supabase.search || supabase.hash ||
      supabase.pathname!=="/" || app.origin===supabase.origin) return false;
    if (app.protocol!=="https:" && !(process.env.NODE_ENV!=="production" && app.protocol==="http:"))
      return false;
    // Assert the same reviewed project for Auth URL and server-owned DB.
    // Preview must use its own isolated stage, never the existing main project.
    assertRuntimeDatabaseTarget(db);
    return true;
  } catch { return false; }
}

export function publicSignupReady() {
  return authConfigReady() && process.env.PUBLIC_SIGNUP_ENABLED === "true";
}

export function siteUrl() {
  const raw = process.env.APP_BASE_URL;
  if (!raw) throw new Error("APP_BASE_URL must be configured");
  const parsed = new URL(raw);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("APP_BASE_URL must be HTTPS in production");
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error("Invalid APP_BASE_URL protocol");
  return parsed.origin;
}
