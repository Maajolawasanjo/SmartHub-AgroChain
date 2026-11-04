import Link from "next/link";
import {z} from "zod";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {SourcingRequestForm} from "@/features/requests/request-form";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
import {requestCatalog} from "@/server/requests/catalog";
import {blankRequest} from "@/server/requests/presentation";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function NewRequest({searchParams}:{searchParams:Promise<{commodityId?:string;templateId?:string}>}){
 const {account,db}=await requireBuyerPage();const member=await buyerMembership(db,account.id);const params=await searchParams;
 const preferredId=z.uuid().safeParse(params.commodityId).success?params.commodityId:undefined;
 const template=member&&z.uuid().safeParse(params.templateId).success?await db.buyerSavedSpecification.findFirst({where:{id:params.templateId,organizationId:member.organizationId}}):null;
 const [commodities,destinations]=await Promise.all([requestCatalog(db,template?.commodityId??preferredId),member?db.buyerDeliveryDestination.findMany({where:{organizationId:member.organizationId},select:{id:true,label:true,state:true,city:true,addressLine:true},orderBy:{createdAt:"desc"},take:20}):Promise.resolve([])]);
 const selected=commodities.find(c=>c.id===(template?.commodityId??preferredId));
 const initial={...blankRequest,deliveryState:template?.deliveryState??"",lines:[{...blankRequest.lines[0],
  commodityId:selected?.id??"",commodityName:selected?.name??"",typeId:template?.typeId??"",specificationId:template?.specificationId??"",
  quantity:template?.quantity.toString()??"",unit:(template?.unit as typeof blankRequest.lines[number]["unit"])??"",qualityNotes:template?.notes??""}]};
 const ready=buyerProfileCompletion(member?.organization??null).complete;
 return <DashboardFrame role="BUYER" name={account.fullName} title="Start a Buyer Request" description="Tell SmartHub what agricultural supply your business needs. Submission begins an assessment, not a purchase.">
 <p className="buyer-back"><Link href="/dashboard/requests">← My requests</Link></p>
 {!member?<section className="buyer-note"><h2>Create your business profile first</h2><p>Save your business profile to start a draft. <Link href="/dashboard/settings">Set up your business</Link>.</p></section>:!["OWNER","EDITOR"].includes(member.role)?<section className="buyer-note">Your business membership permits viewing requests but not creating them.</section>:<SourcingRequestForm mode="create" initial={initial} commodities={commodities} destinations={destinations} profileReady={ready}/>}
 </DashboardFrame>;
}
