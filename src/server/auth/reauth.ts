import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PublicError } from "./http";
/** A detached non-persistent client prevents password checks from changing request cookies/session. */
export async function verifyCurrentPassword(email: string | undefined, password: string, expectedId: string) {
  if (!email || !password) throw new PublicError(403,"Current password confirmation is required.");
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}},
  );
  const {data,error} = await verifier.auth.signInWithPassword({email,password});
  if (error || data.user?.id !== expectedId) throw new PublicError(403,"Current password confirmation failed.");
  return true;
}
