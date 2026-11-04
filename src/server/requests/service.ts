import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {requireBuyerApi} from "@/server/buyer/guard";
import {requireActor} from "@/server/agriculture/policies";
import {hasPermission} from "@/server/admin/permissions";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
import {requestId,requestCreate,requestSave,requestResponse,requestCancel,requestClaim,requestReview,validateSubmittedDraft,type RequestDraft} from "./validation";

export const MAX_OPEN_DRAFTS=30;
type Tx=Prisma.TransactionClient;
function fail(message:string):never{throw new PublicError(400,message);}
function payloadJson(value:RequestDraft):Prisma.InputJsonValue{return value as unknown as Prisma.InputJsonValue;}
function dateFrom(value:string){return value?new Date(`${value}T00:00:00.000Z`):null;}

async function lockBuyer(tx:Tx,accountId:string){
 await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${accountId}::uuid FOR UPDATE`;
 const actor=await tx.account.findUnique({where:{id:accountId},select:{role:true,status:true}});
 if(actor?.role!=="BUYER"||actor.status!=="ACTIVE")throw new PublicError(403,"Active buyer access is required.");
 const member=await tx.buyerMembership.findUnique({where:{accountId},include:{organization:true}});
 if(!member)throw new PublicError(409,"Save your business profile before creating a sourcing request.");
 if(!["OWNER","EDITOR"].includes(member.role))throw new PublicError(403,"You cannot change this organization's sourcing requests.");
 await tx.$queryRaw`SELECT "id" FROM "buyer_organizations" WHERE "id" = ${member.organizationId}::uuid FOR UPDATE`;
 const latest=await tx.buyerMembership.findUnique({where:{accountId},include:{organization:true}});
 if(!latest||latest.organizationId!==member.organizationId||!["OWNER","EDITOR"].includes(latest.role))throw new PublicError(403,"Your business membership has changed.");
 return latest.organization;
}
async function lockRequest(tx:Tx,id:string,organizationId:string){
 await tx.$queryRaw`SELECT "id" FROM "buyer_requests" WHERE "id" = ${id}::uuid FOR UPDATE`;
 const record=await tx.buyerRequest.findFirst({where:{id,organizationId}});
 if(!record)throw new PublicError(404,"Sourcing request not found.");
 return record;
}
async function lockOperations(tx:Tx,actorId:string){
 await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${actorId}::uuid FOR UPDATE`;
 const actor=await tx.account.findUnique({where:{id:actorId},select:{role:true,status:true}});
 if(!actor||actor.status!=="ACTIVE"||!hasPermission(actor.role,"operations.requests.review"))throw new PublicError(403,"Operations request review access is required.");
 return actor;
}
async function lockOperationsRequest(tx:Tx,id:string){
 await tx.$queryRaw`SELECT "id" FROM "buyer_requests" WHERE "id" = ${id}::uuid FOR UPDATE`;
 const record=await tx.buyerRequest.findFirst({where:{id,submittedAt:{not:null}}});
 if(!record)throw new PublicError(404,"Sourcing request not found.");
 return record;
}
async function assertCatalog(tx:Tx,lines:RequestDraft["lines"]){
 const result=[];
 for(const [position,line] of lines.entries()){
  let name=line.commodityName;
  if(line.commodityId){
   const commodity=await tx.commodity.findFirst({where:{id:line.commodityId,active:true,publicPublished:true,category:{is:{active:true}}},select:{id:true,name:true}});
   if(!commodity)fail(`Item ${position+1}: the selected commodity is no longer published.`);
   name=commodity.name;
   if(line.typeId&&!await tx.commodityType.findFirst({where:{id:line.typeId,commodityId:commodity.id,publicPublished:true}}))fail(`Item ${position+1}: the selected variety is not published for this commodity.`);
   if(line.specificationId&&!await tx.commoditySpecification.findFirst({where:{id:line.specificationId,commodityId:commodity.id,publicPublished:true}}))fail(`Item ${position+1}: the selected specification is not published for this commodity.`);
  }
  result.push({position,commodityId:line.commodityId||null,commodityName:name,typeId:line.typeId||null,specificationId:line.specificationId||null,
   variety:line.variety||null,quantity:line.quantity,unit:line.unit,quantityFlexible:line.flexible,
   packaging:line.packaging||null,qualityNotes:line.qualityNotes||null});
 }
 return result;
}
async function replaceLines(tx:Tx,id:string,value:RequestDraft){
 const lines=await assertCatalog(tx,value.lines);
 await tx.buyerRequestLine.deleteMany({where:{requestId:id}});
 await tx.buyerRequestLine.createMany({data:lines.map(line=>({...line,requestId:id}))});
}
function header(value:RequestDraft){return {deliveryState:value.deliveryState,deliveryCity:value.deliveryCity,
 deliveryAddress:value.deliveryAddress||null,requiredDate:dateFrom(value.requiredDate),fulfilmentMethod:value.fulfilmentMethod||null,
 notes:value.notes||null};}
async function event(tx:Tx,requestId:string,actorId:string,kind:"CREATED"|"DRAFT_UPDATED"|"SUBMITTED"|"REVIEW_STARTED"|"CLARIFICATION_REQUESTED"|"CLARIFICATION_ANSWERED"|"SOURCING_STARTED"|"CANCELLED"|"CLOSED",status:string,note?:string){
 await tx.buyerRequestEvent.create({data:{requestId,actorId,kind,status:status as "DRAFT"|"SUBMITTED"|"UNDER_REVIEW"|"MORE_INFO_REQUIRED"|"SOURCING_IN_PROGRESS"|"CANCELLED"|"CLOSED",note:note||null}});
}
async function audit(tx:Tx,actorId:string,requestId:string,action:string,details?:Record<string,unknown>){
 await tx.auditEvent.create({data:{actorId,subjectId:requestId,action,details:(details??{}) as unknown as Prisma.InputJsonValue}});
}
export async function createRequest(input:unknown){
 const value=requestCreate.parse(input);const {account,db}=await requireBuyerApi();
 const fingerprint=createHash("sha256").update(JSON.stringify({action:value.action,payload:value.payload})).digest("hex");
 if(value.action==="submit")try{validateSubmittedDraft(value.payload);}catch(e){fail(e instanceof Error?e.message:"Invalid request.");}
 return db.$transaction(async tx=>{
  const org=await lockBuyer(tx,account.id);
  const existing=await tx.buyerRequest.findUnique({where:{organizationId_clientRequestKey:{organizationId:org.id,clientRequestKey:value.idempotencyKey}}});
  if(existing){
   if(existing.createdById!==account.id||existing.clientRequestHash!==fingerprint)
    throw new PublicError(409,"This submission key was already used for different request details. Reload the form before starting a new request.");
   return {id:existing.id,reference:existing.reference,status:existing.status,version:existing.version};
  }
  if(value.action==="submit"&&!buyerProfileCompletion(org).complete)throw new PublicError(409,"Complete the required business profile fields before submitting. Independent verification is not required for an initial request.");
  if(value.action==="draft"&&await tx.buyerRequest.count({where:{organizationId:org.id,status:"DRAFT"}})>=MAX_OPEN_DRAFTS)
   throw new PublicError(409,"You have reached the limit of 30 open drafts. Finish or cancel an existing draft first.");
  const id=randomUUID();const reference=`REQ-${id.replaceAll("-","").toUpperCase()}`;
  const submitted=value.action==="submit";
  const request=await tx.buyerRequest.create({data:{id,reference,organizationId:org.id,clientRequestKey:value.idempotencyKey,clientRequestHash:fingerprint,createdById:account.id,status:submitted?"SUBMITTED":"DRAFT",
   ...(submitted?header(value.payload):{}),draftPayload:submitted?Prisma.DbNull:payloadJson(value.payload),submittedAt:submitted?new Date():null}});
  if(submitted)await replaceLines(tx,id,value.payload);
  await event(tx,id,account.id,submitted?"SUBMITTED":"CREATED",request.status);
  await audit(tx,account.id,id,submitted?"BUYER_REQUEST_SUBMITTED":"BUYER_REQUEST_DRAFT_CREATED",{organizationId:org.id});
  return {id,reference,status:request.status,version:request.version};
 },{timeout:30000,maxWait:10000});
}
export async function saveRequest(id:string,input:unknown){
 requestId.parse(id);const value=requestSave.parse(input);const {account,db}=await requireBuyerApi();
 if(value.action==="submit")try{validateSubmittedDraft(value.payload);}catch(e){fail(e instanceof Error?e.message:"Invalid request.");}
 return db.$transaction(async tx=>{
  const org=await lockBuyer(tx,account.id);const record=await lockRequest(tx,id,org.id);
  if(record.version!==value.expectedVersion||record.status!=="DRAFT")throw new PublicError(409,"This draft changed or is no longer editable. Reload it.");
  if(value.action==="submit"&&!buyerProfileCompletion(org).complete)throw new PublicError(409,"Complete your business profile before submitting. Independent verification is not required for an initial request.");
  const submitted=value.action==="submit";
  const updated=await tx.buyerRequest.updateMany({where:{id,organizationId:org.id,status:"DRAFT",version:value.expectedVersion},data:{
   ...(submitted?header(value.payload):{}),draftPayload:submitted?Prisma.DbNull:payloadJson(value.payload),
   status:submitted?"SUBMITTED":"DRAFT",submittedAt:submitted?new Date():null,version:{increment:1}}});
  if(updated.count!==1)throw new PublicError(409,"This draft was updated elsewhere. Reload it.");
  if(submitted)await replaceLines(tx,id,value.payload);
  await event(tx,id,account.id,submitted?"SUBMITTED":"DRAFT_UPDATED",submitted?"SUBMITTED":"DRAFT");
  await audit(tx,account.id,id,submitted?"BUYER_REQUEST_SUBMITTED":"BUYER_REQUEST_DRAFT_UPDATED");
  return {id,reference:record.reference,status:submitted?"SUBMITTED":"DRAFT",version:record.version+1};
 },{timeout:30000,maxWait:10000});
}
export async function saveClarificationDraft(id:string,input:unknown){
 requestId.parse(id);const value=requestSave.parse(input);if(value.action!=="draft")fail("Use the clarification response action to resubmit information.");
 const {account,db}=await requireBuyerApi();
 return db.$transaction(async tx=>{
  const org=await lockBuyer(tx,account.id);const record=await lockRequest(tx,id,org.id);
  if(record.status!=="MORE_INFO_REQUIRED"||record.version!==value.expectedVersion)throw new PublicError(409,"This request is no longer awaiting your response. Reload it.");
  const changed=await tx.buyerRequest.updateMany({where:{id,organizationId:org.id,status:"MORE_INFO_REQUIRED",version:value.expectedVersion},data:{draftPayload:payloadJson(value.payload),version:{increment:1}}});
  if(changed.count!==1)throw new PublicError(409,"Request changed. Reload before saving.");
  await event(tx,id,account.id,"DRAFT_UPDATED","MORE_INFO_REQUIRED");await audit(tx,account.id,id,"BUYER_CLARIFICATION_DRAFT_UPDATED");
  return {id,version:record.version+1,status:"MORE_INFO_REQUIRED"};
 });
}
export async function respondToClarification(id:string,input:unknown){
 requestId.parse(id);const value=requestResponse.parse(input);try{validateSubmittedDraft(value.payload);}catch(e){fail(e instanceof Error?e.message:"Invalid request.");}
 const {account,db}=await requireBuyerApi();
 return db.$transaction(async tx=>{
  const org=await lockBuyer(tx,account.id);const record=await lockRequest(tx,id,org.id);
  if(record.status!=="MORE_INFO_REQUIRED"||record.version!==value.expectedVersion)throw new PublicError(409,"This request is no longer awaiting information. Reload it.");
  const question=await tx.buyerRequestClarification.findFirst({where:{requestId:id,answeredAt:null},orderBy:{askedAt:"desc"}});
  if(!question)throw new PublicError(409,"No outstanding clarification was found.");
  await replaceLines(tx,id,value.payload);
  const changed=await tx.buyerRequest.updateMany({where:{id,organizationId:org.id,status:"MORE_INFO_REQUIRED",version:value.expectedVersion},data:{...header(value.payload),draftPayload:Prisma.DbNull,status:"SUBMITTED",version:{increment:1}}});
  if(changed.count!==1)throw new PublicError(409,"Request changed. Reload before submitting.");
  await tx.buyerRequestClarification.update({where:{id:question.id},data:{answer:value.answer,answeredById:account.id,answeredAt:new Date()}});
  await event(tx,id,account.id,"CLARIFICATION_ANSWERED","SUBMITTED",value.answer);
  await audit(tx,account.id,id,"BUYER_REQUEST_CLARIFICATION_ANSWERED",{clarificationId:question.id});
  return {id,status:"SUBMITTED",version:record.version+1};
 },{timeout:30000,maxWait:10000});
}
export async function cancelRequest(id:string,input:unknown){
 requestId.parse(id);const value=requestCancel.parse(input);const {account,db}=await requireBuyerApi();
 return db.$transaction(async tx=>{
  const org=await lockBuyer(tx,account.id);const record=await lockRequest(tx,id,org.id);
  if(!["DRAFT","SUBMITTED","MORE_INFO_REQUIRED"].includes(record.status)||record.version!==value.expectedVersion)
   throw new PublicError(409,"This request is no longer eligible for self-service cancellation. Contact SmartHub Operations.");
  const changed=await tx.buyerRequest.updateMany({where:{id,organizationId:org.id,version:value.expectedVersion,status:{in:["DRAFT","SUBMITTED","MORE_INFO_REQUIRED"]}},data:{status:"CANCELLED",draftPayload:Prisma.DbNull,version:{increment:1}}});
  if(changed.count!==1)throw new PublicError(409,"This request changed. Reload before cancelling.");
  await event(tx,id,account.id,"CANCELLED","CANCELLED",value.reason);await audit(tx,account.id,id,"BUYER_REQUEST_CANCELLED",{reason:value.reason});
  return {id,status:"CANCELLED"};
 },{timeout:30000,maxWait:10000});
}
export async function claimBuyerRequest(id:string,input:unknown){
 requestId.parse(id);const value=requestClaim.parse(input);const {account,db}=await requireActor("OPERATIONS");
 if(!hasPermission(account.role,"operations.requests.review"))throw new PublicError(403,"You cannot review buyer requests.");
 return db.$transaction(async tx=>{
  const actor=await lockOperations(tx,account.id);const request=await lockOperationsRequest(tx,id);
  if(!["SUBMITTED","UNDER_REVIEW","SOURCING_IN_PROGRESS"].includes(request.status))throw new PublicError(409,"This request is not available for reviewer assignment.");
  const existing=await tx.buyerRequestAssignment.findUnique({where:{requestId:id}});
  if(existing?.assignedToId===account.id)return {id,assignedToId:account.id};
  if(existing&&(actor.role!=="SUPER_ADMIN"||!value.override||value.reason.length<10))throw new PublicError(409,"This request is assigned. A Super Admin must provide a reason to take over.");
  if(!existing&&value.override)throw new PublicError(409,"Claim an unassigned request without takeover.");
  if(value.dueAt&&new Date(value.dueAt).getTime()<=Date.now())throw new PublicError(400,"The review target must be in the future.");
  await tx.buyerRequestAssignment.upsert({where:{requestId:id},create:{requestId:id,assignedToId:account.id,assignedById:account.id,dueAt:value.dueAt?new Date(value.dueAt):null},update:{assignedToId:account.id,assignedById:account.id,assignedAt:new Date(),dueAt:value.dueAt?new Date(value.dueAt):null}});
  await audit(tx,account.id,id,existing?"BUYER_REQUEST_REASSIGNED":"BUYER_REQUEST_CLAIMED",{previousReviewerId:existing?.assignedToId??null,reason:value.reason||null,dueAt:value.dueAt||null});
  return {id,assignedToId:account.id};
 },{timeout:30000,maxWait:10000});
}
export async function reviewBuyerRequest(id:string,input:unknown){
 requestId.parse(id);const value=requestReview.parse(input);const {account,db}=await requireActor("OPERATIONS");
 if(!hasPermission(account.role,"operations.requests.review"))throw new PublicError(403,"You cannot review buyer requests.");
 return db.$transaction(async tx=>{
  await lockOperations(tx,account.id);const record=await lockOperationsRequest(tx,id);
  const assignment=await tx.buyerRequestAssignment.findUnique({where:{requestId:id}});
  if(assignment?.assignedToId!==account.id)throw new PublicError(409,"Claim this request before making a decision.");
  if(record.version!==value.expectedVersion)throw new PublicError(409,"This request changed. Reload before deciding.");
  const transitions={start_review:{from:["SUBMITTED"],to:"UNDER_REVIEW",kind:"REVIEW_STARTED"},request_information:{from:["UNDER_REVIEW"],to:"MORE_INFO_REQUIRED",kind:"CLARIFICATION_REQUESTED"},start_sourcing:{from:["UNDER_REVIEW"],to:"SOURCING_IN_PROGRESS",kind:"SOURCING_STARTED"},close:{from:["UNDER_REVIEW","SOURCING_IN_PROGRESS"],to:"CLOSED",kind:"CLOSED"}} as const;
  const transition=transitions[value.action];
  if(!(transition.from as readonly string[]).includes(record.status))throw new PublicError(409,"This decision is not allowed from the current request status.");
  if(value.action==="request_information"){
   const open=await tx.buyerRequestClarification.count({where:{requestId:id,answeredAt:null}});
   if(open)throw new PublicError(409,"An unanswered clarification already exists.");
   await tx.buyerRequestClarification.create({data:{requestId:id,askedById:account.id,question:value.note}});
  }
  const updated=await tx.buyerRequest.updateMany({where:{id,version:value.expectedVersion,status:record.status},data:{status:transition.to,version:{increment:1}}});
  if(updated.count!==1)throw new PublicError(409,"This request changed. Reload before deciding.");
  await event(tx,id,account.id,transition.kind,transition.to,value.note);
  await audit(tx,account.id,id,"BUYER_REQUEST_OPERATIONS_DECISION",{action:value.action,from:record.status,to:transition.to});
  return {id,status:transition.to,version:record.version+1};
 },{timeout:30000,maxWait:10000});
}
