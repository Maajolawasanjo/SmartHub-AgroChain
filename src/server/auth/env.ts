import "server-only";

export function authConfigReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const db = process.env.DATABASE_URL;
  const appUrl = process.env.APP_BASE_URL;
  const secret = process.env.AUTH_RECOVERY_SECRET;
  try {
    if (!url || !key || !db || !appUrl || !secret || secret.length<32) return false;
    const app = new URL(appUrl);
    return new URL(url).protocol === "https:" && /^postgres(ql)?:\/\//.test(db)
      && (app.protocol==="https:" || (process.env.NODE_ENV!=="production" && app.protocol==="http:"));
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
