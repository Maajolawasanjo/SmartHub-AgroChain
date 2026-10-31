import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireFieldAgentPage} from "@/server/field-agent/guard";
import {FieldVisitCreateForm} from "@/features/field-agent/forms";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function NewFieldVisit({searchParams}:{searchParams:Promise<{farmId?:string}>}){
 const {account,db}=await requireFieldAgentPage();const {farmId}=await searchParams;
 if(!farmId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(farmId))notFound();
 const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:account.id,active:true},select:{state:true}});const states=assignments.map(a=>a.state);
 const farm=states.length?await db.farm.findFirst({where:{id:farmId,state:{in:states}},select:{id:true,name:true,state:true,lga:true,community:true,farmer:{select:{fullName:true}}}}):null;
 if(!farm)notFound();
 return <DashboardFrame role="FIELD_AGENT" name={account.fullName} title="Start a Field Visit" description="Create a draft visit for an existing farm within your active assignment scope."><div className="field-agent-page-links"><Link href="/field-agent/farmers">← Assigned farmers</Link><Link href="/field-agent/visits">My field visits</Link></div><section className="agro-panel"><h2>{farm.farmer.fullName} · {farm.name}</h2><p>{farm.lga}, {farm.state}{farm.community?` · ${farm.community}`:""}</p><p className="agro-hint">This records field observations only. It does not approve the farmer, verify supply or publish availability.</p></section><FieldVisitCreateForm farmId={farm.id} farmName={`${farm.farmer.fullName} · ${farm.name}`}/></DashboardFrame>;
}
