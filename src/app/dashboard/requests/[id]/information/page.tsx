import Link from "next/link";
import {notFound} from "next/navigation";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
import {requestCatalog} from "@/server/requests/catalog";
import {draftForForm} from "@/server/requests/presentation";
import {SourcingRequestForm} from "@/features/requests/request-form";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function EditRequest({params}:{params:Promise<{id:string}>}){
 const {account,db}=await requireBuyerPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const member=await buyerMembership(db,account.id);if(!member)notFound();
 const request=await db.buyerRequest.findFirst({where:{id,organizationId:member.organizationId},include:{lines:{orderBy:{position:"asc"}},clarifications:{where:{answeredAt:null},take:1}}});
 if(!request||!["DRAFT","MORE_INFO_REQUIRED"].includes(request.status))notFound();
 const editable=["OWNER","EDITOR"].includes(member.role);
 const initial=draftForForm(request);const [commodities,destinations]=await Promise.all([requestCatalog(db,initial.lines[0]?.commodityId||undefined),db.buyerDeliveryDestination.findMany({where:{organizationId:member.organizationId},select:{id:true,label:true,state:true,city:true,addressLine:true},orderBy:{createdAt:"desc"},take:20})]);
 const mode=request.status==="DRAFT"?"edit" as const:"clarification" as const;
 return <DashboardFrame role="BUYER" name={account.fullName} title={mode==="edit"?"Edit sourcing draft":"Provide More Information"} description={`Request ${request.reference}`}>
 <p className="buyer-back"><Link href={`/dashboard/requests/${id}`}>← Back to request</Link></p>
 {editable?<SourcingRequestForm mode={mode} id={id} version={request.version} initial={initial} commodities={commodities} destinations={destinations} profileReady={buyerProfileCompletion(member.organization).complete} question={request.clarifications[0]?.question}/>:<section className="buyer-note">Your membership does not permit editing requests.</section>}
 </DashboardFrame>;
}
