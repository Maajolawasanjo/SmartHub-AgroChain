import { getAccountContext } from "@/server/auth/context";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function Page(){
 const ctx=await getAccountContext();
 return <main className="container min-h-screen py-20"><section className="surface max-w-xl p-8"><h1 className="text-3xl font-bold">Account access status</h1>
  <p className="mt-4 text-[var(--text-muted)]">{ctx?.account.status==="ACTIVE"?"Your account is active. Further contact verification may be required.":"Account access is restricted or unavailable. Contact SmartHub support to review the next steps."}</p>
  <div className="mt-6 flex gap-4"><Link href="/verify-email">Email verification</Link><Link href="/account/help">Get support</Link><Link href="/logout">Sign out</Link></div>
 </section></main>;
}
