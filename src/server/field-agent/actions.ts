import "server-only";
import { PublicError } from "@/server/auth/http";
import { requireAdminApi } from "@/server/admin/guard";
import { hasPermission } from "@/server/admin/permissions";
import { getPrisma } from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireFieldAgentApi } from "./guard";
import { fieldVisitCancelInput, fieldVisitCreateInput, fieldVisitReviewInput, fieldVisitUpdateInput } from "./validators";

const editableStatuses=["DRAFT","IN_PROGRESS","RETURNED"] as const;
const asVisitDate=(value:string)=>new Date(`${value}T00:00:00.000Z`);
const asNullable=(value:string|undefined)=>value?.trim()?value.trim():null;

async function lockAgent(tx:Prisma.TransactionClient,agentId:string){
  await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${agentId}::uuid FOR UPDATE`;
  const account=await tx.account.findUnique({where:{id:agentId},select:{id:true,role:true,status:true}});
  if(!account||account.role!=="FIELD_AGENT"||account.status!=="ACTIVE")throw new PublicError(403,"Active Field Agent access is required.");
}

async function assertFarmScope(tx:Prisma.TransactionClient,agentId:string,farmId:string){
  await tx.$queryRaw`SELECT "id" FROM "farms" WHERE "id" = ${farmId}::uuid FOR UPDATE`;
  const farm=await tx.farm.findUnique({where:{id:farmId},select:{id:true,farmerId:true,state:true}});
  if(!farm)throw new PublicError(404,"Farm not found in your active assignment scope.");
  const assignment=await tx.fieldAgentAssignment.findFirst({where:{fieldAgentId:agentId,state:farm.state,active:true},select:{id:true}});
  if(!assignment)throw new PublicError(404,"Farm not found in your active assignment scope.");
  return farm;
}

async function getEditableVisit(tx:Prisma.TransactionClient,agentId:string,id:string){
  const owned=await tx.fieldVisit.findFirst({where:{id,fieldAgentId:agentId},select:{id:true}});
  if(!owned)throw new PublicError(404,"Field visit not found.");
  await tx.$queryRaw`SELECT "id" FROM "field_visits" WHERE "id" = ${id}::uuid FOR UPDATE`;
  const visit=await tx.fieldVisit.findFirst({where:{id,fieldAgentId:agentId},select:{id:true,farmId:true,status:true}});
  if(!visit)throw new PublicError(404,"Field visit not found.");
  await tx.$queryRaw`SELECT "id" FROM "farms" WHERE "id" = ${visit.farmId}::uuid FOR UPDATE`;
  const fullVisit=await tx.fieldVisit.findFirst({where:{id,fieldAgentId:agentId},include:{farm:{select:{state:true}},evidence:{select:{id:true,status:true}}}});
  if(!fullVisit)throw new PublicError(404,"Field visit not found.");
  const assignment=await tx.fieldAgentAssignment.findFirst({where:{fieldAgentId:agentId,state:fullVisit.farm.state,active:true},select:{id:true}});
  if(!assignment)throw new PublicError(404,"Field visit is outside your active assignment scope.");
  if(!editableStatuses.includes(fullVisit.status as typeof editableStatuses[number]))throw new PublicError(409,"This visit is no longer editable.");
  return fullVisit;
}

export async function createFieldVisit(input:unknown){
  const {ctx,db}=await requireFieldAgentApi("field.visit.manage");
  const value=fieldVisitCreateInput.parse(input);
  return db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    const farm=await assertFarmScope(tx,ctx.account.id,value.farmId);
    const visit=await tx.fieldVisit.create({data:{fieldAgentId:ctx.account.id,farmerId:farm.farmerId,farmId:farm.id,purpose:value.purpose,visitDate:asVisitDate(value.visitDate)}});
    await tx.fieldVisitEvent.create({data:{visitId:visit.id,actorId:ctx.account.id,eventType:"CREATED",status:"DRAFT"}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_CREATED",subjectId:visit.id,details:{farmId:farm.id,state:farm.state,purpose:value.purpose}}});
    return {id:visit.id,status:visit.status};
  },{timeout:30000,maxWait:10000});
}

export async function updateFieldVisit(id:string,input:unknown){
  const {ctx,db}=await requireFieldAgentApi("field.visit.manage");
  const value=fieldVisitUpdateInput.parse(input);
  return db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    const existing=await getEditableVisit(tx,ctx.account.id,id);
    const data={
      ...(value.farmerPresent!==undefined?{farmerPresent:value.farmerPresent==="unknown"?null:value.farmerPresent==="yes"}:{}),
      ...(value.cropObservations!==undefined?{cropObservations:asNullable(value.cropObservations)}:{}),
      ...(value.productionObservations!==undefined?{productionObservations:asNullable(value.productionObservations)}:{}),
      ...(value.fieldNotes!==undefined?{fieldNotes:asNullable(value.fieldNotes)}:{}),
      ...(value.followUpRequired!==undefined?{followUpRequired:value.followUpRequired}:{}),
      ...(value.followUpRequired===false?{followUpNotes:null}:value.followUpNotes!==undefined?{followUpNotes:asNullable(value.followUpNotes)}:{}),
    };
    if(Object.keys(data).length===0)throw new PublicError(400,"Provide at least one field to update.");
    const changed=await tx.fieldVisit.updateMany({where:{id,fieldAgentId:ctx.account.id,status:existing.status},data});
    if(changed.count!==1)throw new PublicError(409,"Visit changed. Refresh and try again.");
    await tx.fieldVisitEvent.create({data:{visitId:id,actorId:ctx.account.id,eventType:"UPDATED",status:existing.status}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_UPDATED",subjectId:id,details:{status:existing.status}}});
    return {id,status:existing.status};
  },{timeout:30000,maxWait:10000});
}

export async function startFieldVisit(id:string){
  const {ctx,db}=await requireFieldAgentApi("field.visit.manage");
  return db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    const owned=await tx.fieldVisit.findFirst({where:{id,fieldAgentId:ctx.account.id},select:{id:true}});
    if(!owned)throw new PublicError(404,"Field visit not found.");
    await tx.$queryRaw`SELECT "id" FROM "field_visits" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const existing=await tx.fieldVisit.findFirst({where:{id,fieldAgentId:ctx.account.id},select:{id:true,farmId:true,status:true}});
    if(!existing)throw new PublicError(404,"Field visit not found.");
    await tx.$queryRaw`SELECT "id" FROM "farms" WHERE "id" = ${existing.farmId}::uuid FOR UPDATE`;
    const farm=await tx.farm.findUnique({where:{id:existing.farmId},select:{state:true}});
    if(!farm)throw new PublicError(404,"Farm not found.");
    const assignment=await tx.fieldAgentAssignment.findFirst({where:{fieldAgentId:ctx.account.id,state:farm.state,active:true},select:{id:true}});
    if(!assignment)throw new PublicError(404,"Field visit is outside your active assignment scope.");
    if(existing.status!=="DRAFT")throw new PublicError(409,"Only a draft visit can be started.");
    const changed=await tx.fieldVisit.updateMany({where:{id,fieldAgentId:ctx.account.id,status:"DRAFT"},data:{status:"IN_PROGRESS"}});
    if(changed.count!==1)throw new PublicError(409,"Visit changed. Refresh and try again.");
    await tx.fieldVisitEvent.create({data:{visitId:id,actorId:ctx.account.id,eventType:"STARTED",status:"IN_PROGRESS"}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_STARTED",subjectId:id,details:{state:farm.state}}});
    return {id,status:"IN_PROGRESS"};
  },{timeout:30000,maxWait:10000});
}

export async function submitFieldVisit(id:string){
  const {ctx,db}=await requireFieldAgentApi("field.visit.manage");
  return db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    const existing=await getEditableVisit(tx,ctx.account.id,id);
    if(!["IN_PROGRESS","RETURNED"].includes(existing.status))throw new PublicError(409,"Start the visit before submitting the report.");
    if(!existing.fieldNotes||existing.fieldNotes.trim().length<20)throw new PublicError(409,"Add a field report of at least 20 characters before submission.");
    if(existing.evidence.some(e=>["UPLOADING","DELETING"].includes(e.status)))throw new PublicError(409,"Wait for evidence uploads or removals to finish before submitting.");
    if(!existing.evidence.some(e=>e.status==="READY"))throw new PublicError(409,"Attach at least one evidence file before submitting this field report.");
    const changed=await tx.fieldVisit.updateMany({where:{id,fieldAgentId:ctx.account.id,status:existing.status},data:{status:"SUBMITTED",submittedAt:new Date(),reviewedAt:null,reviewedById:null,reviewDecision:null,reviewerNote:null}});
    if(changed.count!==1)throw new PublicError(409,"Visit changed. Refresh and try again.");
    await tx.fieldVisitEvent.create({data:{visitId:id,actorId:ctx.account.id,eventType:"SUBMITTED",status:"SUBMITTED"}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_SUBMITTED",subjectId:id,details:{state:existing.farm.state,purpose:existing.purpose,evidenceCount:existing.evidence.filter(e=>e.status==="READY").length}}});
    return {id,status:"SUBMITTED"};
  },{timeout:30000,maxWait:10000});
}

export async function cancelFieldVisit(id:string,input:unknown){
  const {ctx,db}=await requireFieldAgentApi("field.visit.manage");
  const {reason}=fieldVisitCancelInput.parse(input);
  return db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    const existing=await getEditableVisit(tx,ctx.account.id,id);
    if(existing.evidence.some(e=>["UPLOADING","DELETING"].includes(e.status)))throw new PublicError(409,"Wait for evidence activity to finish before cancelling.");
    const changed=await tx.fieldVisit.updateMany({where:{id,fieldAgentId:ctx.account.id,status:existing.status},data:{status:"CANCELLED",reviewedAt:null,reviewedById:null,reviewDecision:null,reviewerNote:null}});
    if(changed.count!==1)throw new PublicError(409,"Visit changed. Refresh and try again.");
    await tx.fieldVisitEvent.create({data:{visitId:id,actorId:ctx.account.id,eventType:"CANCELLED",status:"CANCELLED",note:reason}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_CANCELLED",subjectId:id,details:{reason}}});
    return {id,status:"CANCELLED"};
  },{timeout:30000,maxWait:10000});
}

export async function reviewFieldVisit(id:string,input:unknown){
  const {ctx,db}=await requireAdminApi("operations.verification.review");
  const value=fieldVisitReviewInput.parse(input);
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${ctx.account.id}::uuid FOR UPDATE`;
    const reviewer=await tx.account.findUnique({where:{id:ctx.account.id},select:{id:true,role:true,status:true}});
    if(!reviewer||reviewer.status!=="ACTIVE"||!hasPermission(reviewer.role,"operations.verification.review"))throw new PublicError(403,"Active Operations review access is required.");
    await tx.$queryRaw`SELECT "id" FROM "field_visits" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const visit=await tx.fieldVisit.findUnique({where:{id},select:{id:true,fieldAgentId:true,status:true,farm:{select:{state:true}}}});
    if(!visit)throw new PublicError(404,"Field report not found.");
    if(visit.fieldAgentId===ctx.account.id)throw new PublicError(403,"You cannot review your own field report.");
    if(visit.status!=="SUBMITTED")throw new PublicError(409,"Only submitted field reports can be reviewed.");
    const next=value.decision==="accept"?"REVIEWED":"RETURNED";
    const decision=value.decision==="accept"?"ACCEPT_REPORT":"RETURN_FOR_CHANGES";
    const changed=await tx.fieldVisit.updateMany({where:{id,status:"SUBMITTED"},data:{status:next,reviewDecision:decision,reviewerNote:value.note,reviewedAt:new Date(),reviewedById:ctx.account.id}});
    if(changed.count!==1)throw new PublicError(409,"Report changed. Refresh and try again.");
    await tx.fieldVisitEvent.create({data:{visitId:id,actorId:ctx.account.id,eventType:value.decision==="accept"?"ACCEPTED":"RETURNED",status:next,note:value.note}});
    await tx.auditEvent.create({data:{actorId:ctx.account.id,action:value.decision==="accept"?"FIELD_VISIT_REPORT_ACCEPTED":"FIELD_VISIT_REPORT_RETURNED",subjectId:id,details:{fieldAgentId:visit.fieldAgentId,state:visit.farm.state,note:value.note}}});
    return {id,status:next};
  },{timeout:30000,maxWait:10000});
}

export async function assertAgentCanReadVisit(visitId:string,agentId:string){
  const db=getPrisma();
  const visit=await db.fieldVisit.findFirst({where:{id:visitId,fieldAgentId:agentId,farm:{is:{state:{in:await activeStates(agentId)}}}},select:{id:true}});
  if(!visit)throw new PublicError(404,"Field visit not found in your active assignment scope.");
  return visit;
}

export async function activeStates(agentId:string){
  const rows=await getPrisma().fieldAgentAssignment.findMany({where:{fieldAgentId:agentId,active:true},select:{state:true},orderBy:{state:"asc"}});
  return rows.map(row=>row.state);
}

