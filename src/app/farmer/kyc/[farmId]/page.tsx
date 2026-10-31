import {notFound} from "next/navigation";
import {PortalFrame,requirePortal} from "@/components/agriculture/portal-frame";
import {FarmForm} from "@/features/agriculture/forms";
export const dynamic="force-dynamic";
export default async function EditFarm({params}:{params:Promise<{farmId:string}>}){
 const {farmId}=await params;
 const {account,db}=await requirePortal("FARMER");
 const [farm,v]=await Promise.all([db.farm.findFirst({where:{id:farmId,farmerId:account.id}}),db.farmerVerification.findUnique({where:{farmerId:account.id}})]);
 if(!farm)notFound();
 const permitted=!v||["DRAFT","MORE_INFO_REQUIRED","REJECTED"].includes(v.status);
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/kyc" title={`Update ${farm.name}`} subtitle="Correct your own farm information and resubmit verification when requested.">
 {permitted?<FarmForm farm={farm}/>:<div className="agro-alert">Editing is locked while verification is pending or approved. Contact Operations for additional changes.</div>}
 </PortalFrame>;
}
