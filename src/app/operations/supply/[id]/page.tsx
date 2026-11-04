import Link from "next/link";
import {notFound} from "next/navigation";
import {PortalFrame,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {OperationsReviewControls} from "@/features/operations/review-controls";
import {LotIntakeForm} from "@/features/orders/order-actions";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export default async function SupplyReviewDetail({params}:{params:Promise<{id:string}>}){
  const {account,db}=await requirePortal("OPERATIONS");
  const {id}=await params;if(!validId(id))notFound();
  const s=await db.supplyDeclaration.findUnique({
    where:{id},
    include:{
      farmer:{select:{id:true,fullName:true,email:true,phone:true}},
      farm:true,commodity:true,supplyLot:true,
      events:{orderBy:{createdAt:"desc"},take:40},
      qualityAssessments:{orderBy:{createdAt:"desc"},take:10,
        include:{reviewer:{select:{fullName:true}},evidenceVisit:{select:{id:true}},specification:{select:{name:true}}}
      }
    }
  });
  if(!s)notFound();
  const [visits,assignment,specifications,verification]=await Promise.all([
    db.fieldVisit.findMany({where:{farmerId:s.farmerId,farmId:s.farmId,purpose:{in:["PRODUCTION_OBSERVATION","CROP_ASSESSMENT"]},status:{in:["SUBMITTED","REVIEWED","RETURNED"]}},
      orderBy:{createdAt:"desc"},take:60,include:{fieldAgent:{select:{fullName:true}},evidence:{where:{status:"READY"},select:{id:true,originalName:true,caption:true}},reviewer:{select:{fullName:true}}}}),
    db.operationsReviewAssignment.findUnique({where:{kind_subjectId:{kind:"SUPPLY_DECLARATION",subjectId:id}},include:{assignedTo:{select:{fullName:true}}}}),
    db.commoditySpecification.findMany({where:{commodityId:s.commodityId},select:{id:true,name:true},orderBy:{name:"asc"}}),
    db.farmerVerification.findUnique({where:{farmerId:s.farmerId},select:{status:true}})
  ]);
  const accepted=visits.filter(v=>v.status==="REVIEWED"&&v.reviewDecision==="ACCEPT_REPORT"&&v.evidence.length>0);
  const evidenceReady=accepted.length>0&&verification?.status==="VERIFIED";
  return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/supply" title="Supply Inspection & Review" subtitle="Reconcile farmer-declared physical quantity with a reviewed field inspection before approving.">
    <div className="agro-toolbar"><Link href="/operations/supply">← Supply queue</Link><StateTag status={s.status}/></div>
    <section className="agro-panel"><h2>{s.commodity.name}</h2><p>Farmer: {s.farmer.fullName} · {s.farmer.phone}</p><p>Farm: {s.farm.name} · {s.farm.lga}, {s.farm.state}</p><p>Farmer verification: {verification?.status||"Not submitted"}</p><p>Farmer-declared quantity: <strong>{s.quantity.toString()} {s.unit}</strong></p>
      <p>Variety: {s.variety||"Not specified"} · Packaging: {s.packaging||"Not specified"}</p><p>Harvest date: {s.harvestDate?.toLocaleDateString("en-NG")||"Not recorded"}</p><p>Farmer-reported condition: {s.reportedCondition}</p><p>Storage: {s.storageNote||"Not recorded"}</p><p>Additional notes: {s.notes||"Not recorded"}</p>
      <p className="agro-hint">Farmer-reported quantity and condition are not independently verified until an Operations inspection assessment is recorded.</p>
    </section>
    <section className="agro-panel"><h2>Field inspection evidence</h2>
      {visits.length?<div className="agro-data-list">{visits.map(visit=><article key={visit.id} className="agro-record"><div><strong>{visit.purpose.replaceAll("_"," ")}</strong><p>{visit.fieldAgent.fullName} · {visit.visitDate.toLocaleDateString("en-NG")}</p><p>{visit.status} · {visit.reviewDecision||"Not yet reviewed"} · Reviewed by {visit.reviewer?.fullName||"Pending"}</p><p>{visit.productionObservations||"No production observations"}</p>{visit.evidence.map(e=><p key={e.id}><a href={`/api/operations/field-visits/${visit.id}/evidence/${e.id}`} target="_blank" rel="noopener noreferrer">Open private evidence: {e.originalName}</a>{e.caption?` — ${e.caption}`:""}</p>)}</div><Link href={`/operations/field-visits/${visit.id}`}>Full report</Link></article>)}</div>:<p>No field inspections submitted for this farm.</p>}
      <p className="agro-hint">An accepted crop or production inspection with ready private evidence is required for supply approval. Inspection evidence must match this farmer and farm.</p>
    </section>
    {s.status==="PENDING_REVIEW"?<OperationsReviewControls kind="supply" id={id} actorId={account.id} actorRole={account.role} assignedToId={assignment?.assignedToId||null} assignedToName={assignment?.assignedTo.fullName||null} evidenceReady={evidenceReady} supply={{quantity:s.quantity.toString(),unit:s.unit,
      visits:accepted.map(v=>({id:v.id,name:`${v.visitDate.toLocaleDateString("en-NG")} · ${v.purpose.replaceAll("_"," ")} · ${v.fieldAgent.fullName}`})),
      specifications:specifications.map(v=>({id:v.id,name:v.name}))}}/>:<section className="agro-panel"><p>This record is not awaiting a decision. An earlier review link cannot override its current status.</p>{s.feedback&&<p>Latest feedback: {s.feedback}</p>}</section>}
    {s.status==="APPROVED"&&(s.supplyLot?<section className="agro-panel"><h2>Registered sourced lot</h2><p>Physical quantity: {s.supplyLot.quantity.toString()} {s.supplyLot.unit}</p><p>Reserved: {s.supplyLot.reservedQuantity.toString()} {s.supplyLot.unit} · Consumed: {s.supplyLot.consumedQuantity.toString()} {s.supplyLot.unit}</p><p>Custody: {s.supplyLot.locationNote}</p><Link className="action action-outline" href="/operations/inventory">Inspect inventory register</Link></section>:<LotIntakeForm supplyId={s.id}/>)}
    <section className="agro-panel"><h2>Recorded inspection assessments</h2>{s.qualityAssessments.length?s.qualityAssessments.map(a=><div className="agro-record" key={a.id}><div><strong>{a.observedQuantity.toString()} {a.observedUnit} observed</strong><p>{a.reviewer.fullName} · {a.createdAt.toLocaleString("en-NG")}</p><p>{a.conditionNote}</p><p>Catalog specification: {a.specification?.name||"Not assessed"}</p></div><Link href={`/operations/field-visits/${a.evidenceVisit.id}`}>Evidence source</Link></div>):<p>No completed inspection assessments recorded.</p>}</section>
    <section className="agro-panel"><h2>Decision history</h2>{s.events.length?s.events.map(event=><p key={event.id}><StateTag status={event.status}/> {event.createdAt.toLocaleString("en-NG")}{event.note?` — ${event.note}`:""}</p>):<p>No decision events recorded.</p>}</section>
  </PortalFrame>;
}
