import "server-only";
import {PublicError} from "@/server/auth/http";
import {requireBuyerApi,buyerMembership} from "./guard";
import {buyerProfileInput,buyerDestinationInput,buyerSpecificationInput} from "./validators";
import type {Prisma} from "@/generated/prisma/client";

function clean(value:string){return value.trim()||null;}
async function lockEditableBuyer(tx:Prisma.TransactionClient,accountId:string,organizationId:string){
  await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${accountId}::uuid FOR UPDATE`;
  const actor=await tx.account.findUnique({where:{id:accountId},select:{role:true,status:true}});
  if(actor?.role!=="BUYER"||actor.status!=="ACTIVE")throw new PublicError(403,"Buyer access changed. Please sign in again.");
  await tx.$queryRaw`SELECT "id" FROM "buyer_organizations" WHERE "id" = ${organizationId}::uuid FOR UPDATE`;
  const member=await tx.buyerMembership.findUnique({where:{accountId},select:{organizationId:true,role:true}});
  if(member?.organizationId!==organizationId||!["OWNER","EDITOR"].includes(member.role))throw new PublicError(403,"Your business access has changed.");
}
async function requireEditableOrganization(accountId:string){
 const {db}=await requireBuyerApi();
 const membership=await buyerMembership(db,accountId);
 if(!membership)throw new PublicError(409,"Complete your business profile before managing saved procurement information.");
 if(!["OWNER","EDITOR"].includes(membership.role))throw new PublicError(403,"You cannot edit this business profile.");
 return {db,organization:membership.organization};
}
export async function saveBuyerProfile(input:unknown){
 const {account,db}=await requireBuyerApi();const value=buyerProfileInput.parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${account.id}::uuid FOR UPDATE`;
  const actor=await tx.account.findUnique({where:{id:account.id},select:{role:true,status:true}});
  if(actor?.role!=="BUYER"||actor.status!=="ACTIVE")throw new PublicError(403,"Buyer access changed. Please sign in again.");
  const membership=await tx.buyerMembership.findUnique({where:{accountId:account.id},include:{organization:true}});
  if(membership && !["OWNER","EDITOR"].includes(membership.role))throw new PublicError(403,"You cannot change this business profile.");
  const data={businessName:clean(value.businessName),businessType:value.businessType||null,
   registrationNumber:clean(value.registrationNumber),contactName:clean(value.contactName),contactEmail:clean(value.contactEmail),
   contactPhone:clean(value.contactPhone),state:clean(value.state),city:clean(value.city),addressLine:clean(value.addressLine),
   preferredContactMethod:value.preferredContactMethod};
  let organizationId:string;
  if(membership){
   if(["PENDING_REVIEW","VERIFIED"].includes(membership.organization.verificationStatus))throw new PublicError(409,"This verified or under-review business profile is locked. Contact SmartHub Operations to request a change.");
   if(!value.expectedUpdatedAt||new Date(value.expectedUpdatedAt).getTime()!==membership.organization.updatedAt.getTime())throw new PublicError(409,"This business profile changed. Reload and try again.");
   const updated=await tx.buyerOrganization.updateMany({where:{id:membership.organizationId,updatedAt:membership.organization.updatedAt},data});
   if(updated.count!==1)throw new PublicError(409,"This business profile changed. Reload and try again.");
   organizationId=membership.organizationId;
  }else{
   const org=await tx.buyerOrganization.create({data});
   await tx.buyerMembership.create({data:{accountId:account.id,organizationId:org.id,role:"OWNER"}});
   organizationId=org.id;
  }
  await tx.auditEvent.create({data:{actorId:account.id,action:"BUYER_PROFILE_SAVED",subjectId:organizationId,details:{fields:Object.keys(data),verificationUnchanged:true}}});
  return {id:organizationId};
 },{timeout:30000,maxWait:10000});
}
export async function saveBuyerDestination(input:unknown){
 const {account}=await requireBuyerApi();const {db,organization}=await requireEditableOrganization(account.id);
 const value=buyerDestinationInput.parse(input);
 return db.$transaction(async tx=>{
  await lockEditableBuyer(tx,account.id,organization.id);
  if(await tx.buyerDeliveryDestination.count({where:{organizationId:organization.id}})>=20)throw new PublicError(409,"A business may save up to 20 delivery destinations.");
  const destination=await tx.buyerDeliveryDestination.create({data:{organizationId:organization.id,label:value.label,state:value.state,city:value.city,addressLine:value.addressLine,contactName:clean(value.contactName),contactPhone:clean(value.contactPhone)}});
  await tx.auditEvent.create({data:{actorId:account.id,action:"BUYER_DESTINATION_ADDED",subjectId:destination.id,details:{organizationId:organization.id}}});
  return {id:destination.id};
 });
}
export async function removeBuyerDestination(id:string){
 const {account}=await requireBuyerApi();const {db,organization}=await requireEditableOrganization(account.id);
 return db.$transaction(async tx=>{
  await lockEditableBuyer(tx,account.id,organization.id);
  const deleted=await tx.buyerDeliveryDestination.deleteMany({where:{id,organizationId:organization.id}});
  if(deleted.count!==1)throw new PublicError(404,"Delivery destination not found.");
  await tx.auditEvent.create({data:{actorId:account.id,action:"BUYER_DESTINATION_REMOVED",subjectId:id,details:{organizationId:organization.id}}});
  return {id};
 });
}
export async function saveBuyerSpecification(input:unknown){
 const {account}=await requireBuyerApi();const {db,organization}=await requireEditableOrganization(account.id);
 const value=buyerSpecificationInput.parse(input);
 return db.$transaction(async tx=>{
  await lockEditableBuyer(tx,account.id,organization.id);
  if(await tx.buyerSavedSpecification.count({where:{organizationId:organization.id}})>=50)throw new PublicError(409,"A business may save up to 50 sourcing templates.");
  const commodity=await tx.commodity.findFirst({where:{id:value.commodityId,active:true,publicPublished:true,category:{is:{active:true}}},select:{id:true}});
  if(!commodity)throw new PublicError(400,"Select a published commodity.");
  if(value.typeId&&!await tx.commodityType.findFirst({where:{id:value.typeId,commodityId:commodity.id,publicPublished:true}}))throw new PublicError(400,"The selected commodity type is not available.");
  if(value.specificationId&&!await tx.commoditySpecification.findFirst({where:{id:value.specificationId,commodityId:commodity.id,publicPublished:true}}))throw new PublicError(400,"The selected specification is not available.");
  const saved=await tx.buyerSavedSpecification.create({data:{organizationId:organization.id,createdById:account.id,commodityId:commodity.id,typeId:value.typeId||null,specificationId:value.specificationId||null,label:value.label,quantity:value.quantity,unit:value.unit,deliveryState:clean(value.deliveryState),notes:clean(value.notes)}});
  await tx.auditEvent.create({data:{actorId:account.id,action:"BUYER_SPECIFICATION_SAVED",subjectId:saved.id,details:{organizationId:organization.id,commodityId:commodity.id}}});
  return {id:saved.id};
 });
}
export async function removeBuyerSpecification(id:string){
 const {account}=await requireBuyerApi();const {db,organization}=await requireEditableOrganization(account.id);
 return db.$transaction(async tx=>{
  await lockEditableBuyer(tx,account.id,organization.id);
  const deleted=await tx.buyerSavedSpecification.deleteMany({where:{id,organizationId:organization.id}});
  if(deleted.count!==1)throw new PublicError(404,"Saved specification not found.");
  await tx.auditEvent.create({data:{actorId:account.id,action:"BUYER_SPECIFICATION_REMOVED",subjectId:id,details:{organizationId:organization.id}}});
  return {id};
 });
}
