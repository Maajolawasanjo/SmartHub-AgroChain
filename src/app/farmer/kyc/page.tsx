import Link from "next/link";
import {PortalFrame,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {FarmForm,VerificationSubmit} from "@/features/agriculture/forms";
export const dynamic="force-dynamic";
export default async function FarmerKyc(){
 const {account,db}=await requirePortal("FARMER");
 const [farms,verification,crops]=await Promise.all([
  db.farm.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"}}),
  db.farmerVerification.findUnique({where:{farmerId:account.id},include:{events:{orderBy:{createdAt:"desc"},take:8}}}),
  db.farmerCrop.count({where:{farmerId:account.id}}),
 ]);
 const status=verification?.status||"PROFILE_INCOMPLETE";
 const editable=!(["VERIFIED","PENDING_REVIEW"] as string[]).includes(status);
 const checklist=[
  {name:"Account contact information",complete:!!(account.fullName&&account.email&&account.phone),href:"/farmer/kyc"},
  {name:"Farm name and operating location",complete:farms.length>0,href:"/farmer/kyc"},
  {name:"Crop records (where applicable)",complete:crops>0,href:"/farmer/my-supply/crops/new"},
  {name:"Submit for verification",complete:!!verification?.submittedAt,href:"/farmer/kyc"},
 ];
 return <PortalFrame role="FARMER" route="/farmer/kyc" name={account.fullName} title="Farm Profile & Verification" subtitle="Manage your own farm information and review actual SmartHub verification decisions.">
  <section className="agro-panel"><h2>Farmer account</h2><p><strong>Name:</strong> {account.fullName}</p><p><strong>Email:</strong> {account.email}</p><p><strong>Phone:</strong> {account.phone}</p><p><strong>Account created:</strong> {account.createdAt.toLocaleDateString("en-NG")}</p><p className="agro-hint">Contact changes require the secure account verification flow. Your role and account ID cannot be changed here.</p><Link className="action action-outline" href="/farmer/settings">Account settings</Link></section>
  <section className="agro-panel"><h2>Current verification status</h2><StateTag status={status}/>
   {verification?.submittedAt&&<p>Submitted: {verification.submittedAt.toLocaleString("en-NG")}</p>}
   {verification?.reviewedAt&&<p>Reviewed: {verification.reviewedAt.toLocaleString("en-NG")}</p>}
   {verification?.feedback&&<p className="agro-alert">Operations feedback: {verification.feedback}</p>}
   <p className="agro-hint">Account email/phone verification, farm verification, and physical supply approval are separate decisions.</p>
  </section>
  <section className="agro-panel"><h2>Onboarding checklist</h2><div className="agro-data-list">{checklist.map(step=><div className="agro-record" key={step.name}><div><h3>{step.name}</h3></div><StateTag status={step.complete?"COMPLETE":"NOT_COMPLETE"}/>{!step.complete&&<Link href={step.href}>Continue</Link>}</div>)}</div></section>
  <section className="agro-panel"><h2>Registered farms</h2>{farms.length?<div className="agro-data-list">{farms.map(f=><div className="agro-record" key={f.id}><div><h3>{f.name}</h3><p>{f.lga}, {f.state}{f.community?` · ${f.community}`:""}</p></div><StateTag status="RECORDED"/>{editable&&<Link href={`/farmer/kyc/${f.id}`}>Edit details</Link>}</div>)}</div>:<p>No farms registered yet.</p>}</section>
  {editable&&<><h2 className="text-xl font-bold mb-3">Add a farm</h2><FarmForm/><VerificationSubmit eligible={farms.length>0}/></>}
  {verification?.events.length?<section className="agro-panel"><h2>Verification history</h2>{verification.events.map(e=><p key={e.id} className="mt-2"><StateTag status={e.status}/> · {e.createdAt.toLocaleDateString("en-NG")}{e.note?` — ${e.note}`:""}</p>)}</section>:null}
 </PortalFrame>;
}
