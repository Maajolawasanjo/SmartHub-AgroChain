import Link from "next/link";
import {PortalFrame,StateTag,requirePortal} from "@/components/agriculture/portal-frame";
import {FarmForm,VerificationSubmit} from "@/features/agriculture/forms";
export const dynamic="force-dynamic";
export default async function FarmerKyc(){
 const {account,db}=await requirePortal("FARMER");
 const [farms,verification]=await Promise.all([db.farm.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"}}),db.farmerVerification.findUnique({where:{farmerId:account.id},include:{events:{orderBy:{createdAt:"desc"},take:8}}})]);
 const status=verification?.status||"PROFILE_INCOMPLETE";
 return <PortalFrame role="FARMER" route="/farmer/kyc" name={account.fullName} title="Farm Profile & Verification" subtitle="Register your farm, review submitted information and see actual Operations decisions.">
  <section className="agro-panel"><h2>Current verification status</h2><StateTag status={status}/>
   {verification?.feedback&&<p className="agro-alert">Operations feedback: {verification.feedback}</p>}
   <p className="agro-hint">Account email/phone verification is separate from farm identity verification. Adding a farm does not verify it.</p>
  </section>
  <section className="agro-panel"><h2>Registered farms</h2>{farms.length?<div className="agro-data-list">{farms.map(f=><div className="agro-record" key={f.id}><div><h2>{f.name}</h2><p>{f.lga}, {f.state}{f.community?` · ${f.community}`:""}</p></div><StateTag status="RECORDED"/>{!["VERIFIED","PENDING_REVIEW"].includes(status)&&<Link href={`/farmer/kyc/${f.id}`}>Edit details</Link>}</div>)}</div>:<p>No farms registered yet.</p>}</section>
  {!["VERIFIED","PENDING_REVIEW"].includes(status)&&<><h2 className="text-xl font-bold mb-3">Add a farm</h2><FarmForm/>
  {status!=="PENDING_REVIEW"&&<VerificationSubmit eligible={farms.length>0}/>}</>}
  {verification?.events.length?<section className="agro-panel"><h2>Verification history</h2>{verification.events.map(e=><p key={e.id} className="mt-2"><StateTag status={e.status}/> · {e.createdAt.toLocaleDateString("en-NG")}{e.note?` — ${e.note}`:""}</p>)}</section>:null}
 </PortalFrame>;
}
