import Link from "next/link";
import {notFound} from "next/navigation";
import {PortalFrame,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {OperationsReviewControls} from "@/features/operations/review-controls";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
const validId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export default async function FarmerVerificationDetail({params}:{params:Promise<{id:string}>}){
  const {account,db}=await requirePortal("OPERATIONS");
  const {id}=await params;if(!validId(id))notFound();
  const v=await db.farmerVerification.findUnique({where:{id},include:{farmer:{include:{farms:true}},events:{orderBy:{createdAt:"desc"},take:40}}});
  if(!v)notFound();
  const [reports,assignment]=await Promise.all([
    db.fieldVisit.findMany({where:{farmerId:v.farmerId,purpose:{in:["FARMER_VERIFICATION","FARM_ASSESSMENT"]},status:{in:["SUBMITTED","REVIEWED","RETURNED"]}},
      orderBy:{createdAt:"desc"},take:60,include:{farm:{select:{name:true}},fieldAgent:{select:{fullName:true}},evidence:{where:{status:"READY"},select:{id:true,originalName:true,caption:true}},reviewer:{select:{fullName:true}}}}),
    db.operationsReviewAssignment.findUnique({where:{kind_subjectId:{kind:"FARMER_VERIFICATION",subjectId:id}},include:{assignedTo:{select:{fullName:true}}}})
  ]);
  const covered=new Set(reports.filter(r=>r.status==="REVIEWED"&&r.reviewDecision==="ACCEPT_REPORT"&&r.evidence.length>0).map(r=>r.farmId));
  const evidenceReady=v.farmer.farms.length>0&&v.farmer.farms.every(f=>covered.has(f.id));
  return <PortalFrame role="OPERATIONS" name={account.fullName} route="/operations/verification" title="Farmer Verification Review" subtitle="Check the farm profile, independent Field Agent evidence and review history before deciding.">
    <div className="agro-toolbar"><Link href="/operations/verification">← Verification queue</Link><StateTag status={v.status}/></div>
    <section className="agro-panel"><h2>{v.farmer.fullName}</h2><p>Contact: {v.farmer.email} · {v.farmer.phone}</p><p>Submitted: {v.submittedAt?.toLocaleString("en-NG")||"Not submitted"}</p>
      <h3>Registered farms and evidence coverage</h3>
      {v.farmer.farms.length?<div className="agro-data-list">{v.farmer.farms.map(f=><div className="agro-record" key={f.id}><div><strong>{f.name}</strong><p>{f.lga}, {f.state}{f.community?` · ${f.community}`:""}</p><p>{f.locationNote||"No location notes"}</p></div><span>{covered.has(f.id)?"Accepted evidence available":"Evidence still required"}</span></div>)}</div>:<p>No farms registered. Approval is blocked.</p>}
    </section>
    <section className="agro-panel"><h2>Field Agent reports and private evidence</h2>
      {reports.length?<div className="agro-data-list">{reports.map(report=><article className="agro-record" key={report.id}><div><strong>{report.farm.name} · {report.purpose.replaceAll("_"," ")}</strong><p>{report.fieldAgent.fullName} · {report.visitDate.toLocaleDateString("en-NG")}</p><p>Status: {report.status} · Decision: {report.reviewDecision||"Pending"} · Reviewed by {report.reviewer?.fullName||"Not reviewed"}</p><p>{report.fieldNotes||"No report notes"}</p>{report.evidence.map(e=><p key={e.id}><a href={`/api/operations/field-visits/${report.id}/evidence/${e.id}`} target="_blank" rel="noopener noreferrer">Open private evidence: {e.originalName}</a>{e.caption?` — ${e.caption}`:""}</p>)}</div><Link href={`/operations/field-visits/${report.id}`}>Full report</Link></article>)}</div>:<p>No submitted Field Agent verification reports yet.</p>}
      <p className="agro-hint">Approval requires an accepted report with ready private evidence for every registered farm. Report acceptance alone does not approve the farmer.</p>
    </section>
    {v.status==="PENDING_REVIEW"?<OperationsReviewControls kind="verification" id={id} actorId={account.id} actorRole={account.role} assignedToId={assignment?.assignedToId||null} assignedToName={assignment?.assignedTo.fullName||null} evidenceReady={evidenceReady}/>:<section className="agro-panel"><p>This case is not pending review. A new farmer submission is required before another decision.</p>{v.feedback&&<p>Latest feedback: {v.feedback}</p>}</section>}
    <section className="agro-panel"><h2>Decision history</h2>{v.events.length?v.events.map(event=><p key={event.id}><StateTag status={event.status}/> {event.createdAt.toLocaleString("en-NG")}{event.note?` — ${event.note}`:""}</p>):<p>No decision events recorded.</p>}</section>
  </PortalFrame>;
}
