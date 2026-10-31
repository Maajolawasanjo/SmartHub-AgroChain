import Link from "next/link";
import {notFound} from "next/navigation";
import {PortalFrame,EmptyState,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {ReviewForm,CommodityForm} from "@/features/agriculture/forms";
export const dynamic="force-dynamic";
export default async function OperationsPage({params}:{params:Promise<{slug:string[]}>}){
 const [view,id,extra]=(await params).slug;
 if(extra||!["verification","supply","catalog"].includes(view)||(view==="catalog"&&id))notFound();
 const {account,db}=await requirePortal("OPERATIONS");
 if(view==="catalog"){
  const list=await db.commodity.findMany({orderBy:{name:"asc"}});
  return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/catalog" title="Commodity Catalog" subtitle="Configure approved agricultural products before farmers add crops or declarations.">
   <section className="agro-panel"><h2>Add supported commodity</h2><p>Only authorized Operations staff may create catalog items. No example catalog is published as actual data.</p></section><CommodityForm/>
   <section className="agro-panel"><h2>Configured commodities ({list.length})</h2>{list.length?<div className="agro-data-list">{list.map(c=><div className="agro-record" key={c.id}><h2>{c.name}</h2><StateTag status={c.active?"ACTIVE":"INACTIVE"}/></div>)}</div>:<p>No commodities configured yet.</p>}</section>
  </PortalFrame>;
 }
 if(view==="verification"){
  if(id){
   const v=await db.farmerVerification.findUnique({where:{id},include:{farmer:{include:{farms:true}},events:{orderBy:{createdAt:"desc"},take:20}}});
   if(!v)notFound();
   return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/verification" title="Farmer Verification Review" subtitle="Examine submitted farm details before recording an Operations decision.">
    <section className="agro-panel"><h2>{v.farmer.fullName}</h2><StateTag status={v.status}/><p>Email: {v.farmer.email}</p><p>Phone: {v.farmer.phone}</p>
    <h3 className="font-bold mt-5">Registered farms</h3>{v.farmer.farms.map(f=><p key={f.id}>{f.name} · {f.lga}, {f.state}{f.community?` · ${f.community}`:""}</p>)}
    </section>{v.status==="PENDING_REVIEW"?<ReviewForm kind="verification" id={id}/>:<p className="agro-alert">This case is not pending. A new farmer submission is needed before another review.</p>}
    <section className="agro-panel"><h2>Decision history</h2>{v.events.map(e=><p key={e.id}><StateTag status={e.status}/> {e.createdAt.toLocaleString("en-NG")}{e.note?` — ${e.note}`:""}</p>)}</section>
   </PortalFrame>;
  }
  const items=await db.farmerVerification.findMany({where:{status:"PENDING_REVIEW"},include:{farmer:{select:{fullName:true,state:true}},_count:{select:{events:true}}},orderBy:{submittedAt:"asc"},take:100});
  return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/verification" title="Farmer Verification Queue" subtitle="Review farmer profiles awaiting an authorized verification decision.">
   {items.length?<div className="agro-data-list">{items.map(v=><div className="agro-record" key={v.id}><div><h2>{v.farmer.fullName}</h2><p>{v.farmer.state||"State not recorded"} · submitted {v.submittedAt?.toLocaleDateString("en-NG")||"Date not recorded"}</p></div><StateTag status={v.status}/><Link href={`/operations/verification/${v.id}`}>Review</Link></div>)}</div>:<EmptyState title="No farmer verifications awaiting review" body="New verified-contact farmers will appear when they submit their farm information."/>}
  </PortalFrame>;
 }
 if(id){
  const s=await db.supplyDeclaration.findUnique({where:{id},include:{farmer:{select:{id:true,fullName:true,email:true,phone:true}},farm:true,commodity:true,events:{orderBy:{createdAt:"desc"},take:20}}});
  if(!s)notFound();
  return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/supply" title="Supply Verification Review" subtitle="Compare farmer-reported physical stock with available inspection and operational evidence.">
   <section className="agro-panel"><h2>{s.commodity.name}</h2><StateTag status={s.status}/>
    <p>Farmer: {s.farmer.fullName} · {s.farmer.phone}</p><p>Farm: {s.farm.name} · {s.farm.lga}, {s.farm.state}</p>
    <p>Declared quantity: {s.quantity.toString()} {s.unit}</p><p>Variety: {s.variety||"Not specified"}</p>
    <p>Farmer-reported condition: {s.reportedCondition}</p><p>Packaging: {s.packaging||"Not specified"}</p>
    <p>Storage notes: {s.storageNote||"Not specified"}</p><p>Additional notes: {s.notes||"Not specified"}</p>
   </section>
   {s.status==="PENDING_REVIEW"?<ReviewForm kind="supply" id={id}/>:<p className="agro-alert">This supply is not pending review. Do not override it through an earlier review link.</p>}
   <section className="agro-panel"><h2>Review history</h2>{s.events.map(e=><p key={e.id}><StateTag status={e.status}/> {e.createdAt.toLocaleString("en-NG")}{e.note?` — ${e.note}`:""}</p>)}</section>
  </PortalFrame>;
 }
 const list=await db.supplyDeclaration.findMany({where:{status:"PENDING_REVIEW"},include:{farmer:{select:{fullName:true}},commodity:true},orderBy:{submittedAt:"asc"},take:100});
 return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/supply" title="Supply Review Queue" subtitle="Farmer-declared quantities awaiting Operations review.">
 {list.length?<div className="agro-data-list">{list.map(s=><div className="agro-record" key={s.id}><div><h2>{s.commodity.name} · {s.quantity.toString()} {s.unit}</h2><p>{s.farmer.fullName} · submitted {s.submittedAt?.toLocaleDateString("en-NG")||"Date unknown"}</p></div><StateTag status={s.status}/><Link href={`/operations/supply/${s.id}`}>Review</Link></div>)}</div>:<EmptyState title="No pending supply to review" body="Submitted produce will appear here once a verified farmer has declared actual stock."/>}
 </PortalFrame>;
}
