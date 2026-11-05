import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma } from "@/server/db/prisma";
import { authConfigReady } from "@/server/auth/env";
import type { AccountRole } from "@/generated/prisma/client";
import { reconcilePublicAccount } from "./provisioning";

export async function getIdentity() {
  if (!authConfigReady()) return null;
  const supabase=await createSupabaseServerClient();
  const { data, error }=await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { user:data.user, supabase };
}

export async function getAccountContext() {
  const identity=await getIdentity();
  if (!identity) return null;
  let account=await getPrisma().account.findUnique({where:{id:identity.user.id}});
  if (!account) account=await reconcilePublicAccount(identity.user);
  if (!account) return null;
  // Verified provider email is authoritative after a completed change-email callback.
  if(identity.user.email_confirmed_at && identity.user.email && identity.user.email.toLowerCase()!==account.email){
    account=await getPrisma().account.update({where:{id:account.id},data:{email:identity.user.email.toLowerCase()}});
  }
  return {...identity, account};
}

export function accountDestination(ctx:NonNullable<Awaited<ReturnType<typeof getAccountContext>>>) {
  const {account,user}=ctx;
  if (account.status!=="ACTIVE") return "/account/status";
  if (!user.email_confirmed_at) return "/verify-email";
  if (account.role==="FARMER" && !(user.phone_confirmed_at && user.phone===account.phone)) return "/verify-phone";
  const destinations:Record<AccountRole,string>={BUYER:"/dashboard",FARMER:"/farmer",FIELD_AGENT:"/field-agent",OPERATIONS:"/operations",SUPER_ADMIN:"/admin"};
  return destinations[account.role];
}

/** A defense-in-depth authorization predicate shared by portal entrypoints. */
export function mayAccess(ctx:NonNullable<Awaited<ReturnType<typeof getAccountContext>>>, route:string){
  // Login alone never grants application access: provider verification and
  // authoritative DB account state are both required.
  if(ctx.account.status!=="ACTIVE" || !ctx.user.email_confirmed_at) return false;
  if(ctx.account.role==="FARMER" &&
    !(ctx.user.phone_confirmed_at && ctx.user.phone===ctx.account.phone)) return false;

  // Match complete route segments; /admin-extra and /operations-bypass
  // must never be treated as privileged workspace paths.
  const inside=(base:string)=>route===base || route.startsWith(base+"/");
  if(inside("/admin")) return ctx.account.role==="SUPER_ADMIN";
  if(inside("/operations")) return ["OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role);
  if(inside("/field-agent")) return ctx.account.role==="FIELD_AGENT";
  if(inside("/farmer")) return ctx.account.role==="FARMER";
  if(inside("/dashboard")) return ctx.account.role==="BUYER";
  return true;
}
