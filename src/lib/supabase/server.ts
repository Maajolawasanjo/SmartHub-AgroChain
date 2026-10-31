import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { authConfigReady } from "@/server/auth/env";

export async function createSupabaseServerClient() {
  if (!authConfigReady()) throw new Error("Authentication environment is incomplete");
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          try { values.forEach(({name,value,options}) => cookieStore.set(name,value,options)); }
          catch { /* Server Components cannot set cookies; Next proxy handles refresh. */ }
        },
      },
    },
  );
}
