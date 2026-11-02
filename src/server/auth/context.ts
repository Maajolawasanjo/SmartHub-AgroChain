import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrisma } from "@/server/db/prisma";
import { authConfigReady } from "@/server/auth/env";
import type { AccountRole } from "@/generated/prisma/client";

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

export function mayAccess(ctx:NonNullable<Awaited<ReturnType<typeof getAccountContext>>>, route:string){
  if (route.startsWith("/admin")) return ctx.account.role==="SUPER_ADMIN" && ctx.account.status==="ACTIVE";
  if (route.startsWith("/operations")) return ["OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role) && ctx.account.status==="ACTIVE";
  if (route.startsWith("/field-agent")) return ctx.account.role==="FIELD_AGENT" && ctx.account.status==="ACTIVE";
  if (route==="/farmer" || route.startsWith("/farmer/")) return ctx.account.role==="FARMER" && ctx.account.status==="ACTIVE";
  if (route==="/dashboard" || route.startsWith("/dashboard/")) return ctx.account.role==="BUYER" && ctx.account.status==="ACTIVE";
  return ctx.account.status==="ACTIVE";
}
