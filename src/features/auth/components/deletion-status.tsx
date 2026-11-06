import Link from "next/link";
import { getAccountContext } from "@/server/auth/context";
import { getPrisma } from "@/server/db/prisma";

export async function DeletionStatus({route}:{route:string}){
 const ctx=await getAccountContext();
 if(!ctx)return null;
 const latest=await getPrisma().deletionRequest.findFirst({where:{accountId:ctx.account.id},orderBy:{requestedAt:"desc"}});
 const status=latest?.status;
 const statusText=status==="COMPLETED"?"Your account deletion request has been completed according to the recorded review outcome."
  : status==="DENIED"?"Your deletion request was denied. Contact support for further information."
  : status==="CANCELLED"?"Your deletion request was cancelled."
  : status==="UNDER_REVIEW"?"Your deletion request is under review."
  : status==="REQUESTED"?"Your deletion request has been recorded and is awaiting review."
  :"No account deletion request has been recorded for this account.";
 return <main className="container min-h-screen py-20"><section className="surface max-w-xl p-8">
  <p className="eyebrow">Account lifecycle</p><h1 className="mt-3 text-3xl font-bold">Deletion request status</h1>
  <p className="mt-5 leading-7 text-[var(--text-muted)]">{statusText}</p>
  {latest&&<p className="mt-3 text-xs text-[var(--text-muted)]">Requested: {latest.requestedAt.toISOString().slice(0,10)} · Status: {status}</p>}
  <div className="mt-8 flex flex-wrap gap-4">{status==="REQUESTED"&&<Link href="/account/delete/cancel">Cancel request</Link>}<Link href="/account/profile">My profile</Link><Link href="/account/help">Contact support</Link><Link href="/account/delete">Deletion policy</Link></div>
 </section></main>;
}
