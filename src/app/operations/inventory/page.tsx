import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
import {LotStatusForm} from "@/features/orders/order-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function SourceLots({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {account,db}=await requirePortal("OPERATIONS");
 const query=await searchParams;const page=Math.min(500,Math.max(1,Number.parseInt(query.page??"1",10)||1));
 const [lots,total,unregistered]=await Promise.all([
  db.supplyLot.findMany({orderBy:{updatedAt:"desc"},skip:(page-1)*20,take:20,
   include:{supply:{include:{commodity:{select:{name:true}},farmer:{select:{fullName:true}}}}}}),
  db.supplyLot.count(),
  db.supplyDeclaration.findMany({where:{status:"APPROVED",supplyLot:{is:null}},orderBy:{reviewedAt:"desc"},take:15,
   include:{commodity:{select:{name:true}},farmer:{select:{fullName:true}}}})
 ]);
 return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/inventory" title="Verified Physical Supply Lots" subtitle="Register and control sourced lots using reviewed field evidence; never count predicted harvest as available stock.">
 <div className="agro-toolbar"><Link href="/operations/orders">Pending orders & reservations</Link><Link href="/operations/supply?status=APPROVED">Approved supply queue</Link></div>
 <section className="agro-panel"><h2>Registered sourced lots ({total})</h2>
 {lots.length?<div className="agro-data-list">{lots.map(l=><article key={l.id} className="agro-record"><div><h3>{l.supply.commodity.name} · {l.supply.farmer.fullName}</h3>
  <p>Inspected quantity {l.quantity.toString()} {l.unit} · reserved {l.reservedQuantity.toString()} {l.unit} · consumed {l.consumedQuantity.toString()} {l.unit}</p>
  <p>Available for new holds: {l.quantity.minus(l.reservedQuantity).minus(l.consumedQuantity).toString()} {l.unit} · Custody: {l.locationNote}</p>
  <p>Source declaration <Link href={"/operations/supply/"+l.supplyId}>{l.supplyId.slice(0,8)}</Link> · Created {l.createdAt.toLocaleString("en-NG")}</p>
 </div><StateTag status={l.status}/><LotStatusForm id={l.id} status={l.status}/></article>)}</div>:<EmptyState title="No registered physical lots" body="An approved physical supply declaration and accepted inspection are required before a sourcing lot can be registered."/>}
 </section>
 {total>20&&<nav className="agro-toolbar" aria-label="Inventory pagination"><span>Page {page} / {Math.ceil(total/20)}</span>{page>1&&<Link href={"/operations/inventory?page="+(page-1)}>Previous</Link>}{page*20<total&&<Link href={"/operations/inventory?page="+(page+1)}>Next</Link>}</nav>}
 <section className="agro-panel"><h2>Approved supplies not yet registered (latest 15)</h2>{unregistered.length?unregistered.map(s=><div className="agro-record" key={s.id}><div><strong>{s.commodity.name}</strong><p>{s.farmer.fullName} · {s.quantity.toString()} {s.unit} declared · physical inspection must be revalidated</p></div><Link href={"/operations/supply/"+s.id}>Review evidence & register lot</Link></div>):<p>No unregistered approved declarations are currently shown.</p>}</section>
 <div className="agro-alert">Sourced physical lot availability reflects inspected quantities minus reserved and consumed balances. It does not prove SmartHub owns the produce, paid the farmer, or can dispatch it from a warehouse.</div>
 </PortalFrame>;
}
