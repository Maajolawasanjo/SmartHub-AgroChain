import Link from "next/link";
import {PortalFrame,requirePortal,EmptyState,StateTag} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function MatchingWorkspace(){
 const {account,db}=await requirePortal("OPERATIONS");
 const requests=await db.buyerRequest.findMany({where:{status:"SOURCING_IN_PROGRESS",submittedAt:{not:null}},orderBy:{updatedAt:"desc"},take:50,
  include:{organization:{select:{businessName:true}},lines:{orderBy:{position:"asc"},select:{commodityName:true,quantity:true,unit:true}},assignment:{include:{assignedTo:{select:{fullName:true}}}},quotation:{select:{id:true,status:true}}}});
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/matching" title="Supply Matching & Quotes" subtitle="Source approved produce against buyer demand, invite farmers and prepare controlled commercial quotations.">
 <div className="agro-toolbar"><Link href="/operations/requests">← Buyer demand queue</Link><span>{requests.length} active sourcing cases (latest 50)</span></div>
 <section className="agro-panel"><h2>Active sourcing cases</h2>{requests.length?<div className="agro-data-list">{requests.map(r=><article key={r.id} className="agro-record"><div><h3>{r.reference} · {r.organization.businessName??"Buyer organization"}</h3><p>{r.lines.map(l=>l.commodityName+" · "+l.quantity.toString()+" "+l.unit).join("; ")}</p><p>Reviewer: {r.assignment?.assignedTo.fullName??"Unassigned"} · Quote: {r.quotation?.status??"Not prepared"}</p></div><StateTag status={r.quotation?.status??r.status}/><Link href={"/operations/matching/"+r.id}>Open matching</Link></article>)}</div>:<EmptyState title="No active sourcing cases" body="Operations must first review a submitted buyer request and move it into sourcing."/>}</section>
 <div className="agro-alert">Approved physical supply can be considered for matching. A candidate is not stock, a reservation, a committed seller or a buyer quotation.</div>
 </PortalFrame>;
}
