import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {StatusPill} from "@/components/dashboard/dashboard-ui";
import {requireFieldAgentPage} from "@/server/field-agent/guard";
import {FieldVisitEditor,FieldVisitEvidencePanel} from "@/features/field-agent/forms";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function FieldVisitDetail({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireFieldAgentPage();const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();
 const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:account.id,active:true},select:{state:true}});const states=assignments.map(a=>a.state);
 const visit=states.length?await db.fieldVisit.findFirst({where:{id,fieldAgentId:account.id,farm:{is:{state:{in:states}}}},include:{farmer:{select:{fullName:true,farmName:true}},farm:{select:{name:true,state:true,lga:true,community:true,locationNote:true}},evidence:{where:{status:{in:["READY","FAILED","UPLOADING","DELETING"]}},orderBy:{createdAt:"asc"},select:{id:true,originalName:true,contentType:true,sizeBytes:true,caption:true,status:true,createdAt:true,updatedAt:true}},events:{orderBy:{createdAt:"desc"},take:30,select:{eventType:true,status:true,note:true,createdAt:true,actor:{select:{fullName:true,role:true}}}}}}):null;
 if(!visit)notFound();
 const editable=["DRAFT","IN_PROGRESS","RETURNED"].includes(visit.status);
 return <DashboardFrame role="FIELD_AGENT" name={account.fullName} title="Field Visit Report" description="Your observations and evidence remain private to authorized SmartHub staff."><div className="field-agent-page-links"><Link href="/field-agent/visits">← My visits</Link><Link href="/field-agent/farmers">Find another farmer</Link></div>
  <section className="agro-panel"><div className="field-agent-detail-heading"><div><span className="staff-eyebrow">{visit.id}</span><h2>{visit.farmer.fullName} · {visit.farm.name}</h2><p>{visit.farm.lga}, {visit.farm.state}{visit.farm.community?` · ${visit.farm.community}`:""}</p></div><StatusPill status={visit.status}/></div><dl className="field-agent-detail-grid"><div><dt>Visit date</dt><dd>{visit.visitDate.toLocaleDateString("en-NG")}</dd></div><div><dt>Purpose</dt><dd>{visit.purpose.replaceAll("_"," ").toLowerCase()}</dd></div><div><dt>Farm location notes</dt><dd>{visit.farm.locationNote||"Not recorded"}</dd></div><div><dt>Report submitted</dt><dd>{visit.submittedAt?.toLocaleString("en-NG")||"Not submitted"}</dd></div></dl>{visit.reviewerNote&&<div className="agro-alert"><strong>Operations review note</strong><p>{visit.reviewerNote}</p></div>}{visit.status==="REVIEWED"&&<div className="agro-alert">Operations accepted this report. This is not a farmer verification or supply approval.</div>}</section>
  <FieldVisitEditor visitId={visit.id} status={visit.status} farmerPresent={visit.farmerPresent} cropObservations={visit.cropObservations} productionObservations={visit.productionObservations} fieldNotes={visit.fieldNotes} followUpRequired={visit.followUpRequired} followUpNotes={visit.followUpNotes}/>
  <FieldVisitEvidencePanel visitId={visit.id} status={visit.status} initialEvidence={visit.evidence.map(e=>({...e,createdAt:e.createdAt.toISOString(),updatedAt:e.updatedAt.toISOString()}))}/>
  <section className="agro-panel"><h2>Visit history</h2>{visit.events.length?<div className="field-agent-history">{visit.events.map((event,i)=><article key={`${event.eventType}-${i}`}><span className="field-agent-history-dot"/><div><strong>{event.eventType.replaceAll("_"," ").toLowerCase()}</strong><p>{event.note||event.status.replaceAll("_"," ").toLowerCase()} · {event.actor.fullName} · {event.createdAt.toLocaleString("en-NG")}</p></div></article>)}</div>:<p className="agro-hint">No visit events recorded yet.</p>}</section>
 </DashboardFrame>;
}
