import Link from "next/link";
import {PortalFrame,requirePortal,StateTag,EmptyState} from "@/components/agriculture/portal-frame";
import {OpportunityResponseForm} from "@/features/commerce/commerce-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FarmerOpportunities(){
 const {account,db}=await requirePortal("FARMER");
 const matches=await db.matchProposal.findMany({where:{supply:{farmerId:account.id},status:{in:["INVITED","INTERESTED","DECLINED"]}},
  orderBy:{createdAt:"desc"},take:50,include:{requestLine:{include:{request:{select:{status:true,deliveryState:true,deliveryCity:true,requiredDate:true}}}},interests:true}});
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/opportunities" title="SmartHub Opportunities" subtitle="Respond to verified sourcing invitations without sharing your contact details directly with buyers.">
 <div className="agro-toolbar"><Link href="/farmer/my-supply">← My supply</Link></div>
 {matches.length?<div className="agro-data-list">{matches.map(m=><section key={m.id} className="agro-panel"><div className="agro-toolbar"><h2>{m.requestLine.commodityName}</h2><StateTag status={m.status}/></div>
  <p>Proposed supply: {m.quantity.toString()} {m.unit}. Buyer requirement: {m.requestLine.quantity.toString()} {m.requestLine.unit}.</p>
  <p>Target region: {[m.requestLine.request.deliveryCity,m.requestLine.request.deliveryState].filter(Boolean).join(", ")||"To be agreed"} · Required by: {m.requestLine.request.requiredDate?.toLocaleDateString("en-NG")??"Not specified"}</p>
  {m.status==="INVITED"&&m.requestLine.request.status==="SOURCING_IN_PROGRESS"?<OpportunityResponseForm matchId={m.id}/>:<p className="agro-hint">Your response: {m.interests[0]?.response??"No active response"} · {m.interests[0]?.note??"No additional note"}</p>}
  <p className="agro-hint">An expression of interest is not an order, stock reservation or guarantee of sale. SmartHub coordinates any transaction.</p>
 </section>)}</div>:<EmptyState title="No invitations yet" body="Only direct, recorded invitations from SmartHub Operations appear here. You can continue updating approved supply." href="/farmer/my-supply" action="Manage supply"/>}
 </PortalFrame>;
}
