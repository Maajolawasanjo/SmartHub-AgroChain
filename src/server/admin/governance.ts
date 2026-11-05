import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {z} from "zod";
import {PublicError} from "@/server/auth/http";
import {requireAdminApi} from "@/server/admin/guard";
import {getPrisma} from "@/server/db/prisma";

const uuid=z.uuid();
const subjectType=z.enum(["ACCOUNT","ORDER","BUYER_PAYMENT","SUPPLIER_OBLIGATION","SHIPMENT","SUPPORT_CASE"]);
const category=z.enum(["ACCESS","FINANCIAL_EXCEPTION","SOURCING","DELIVERY","COMPLIANCE","SYSTEM"]);
const severity=z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]);
const reason=z.enum(["INVESTIGATION","DOCUMENTED_ACTION","RISK_REVIEW","EXTERNAL_RESOLUTION","FALSE_POSITIVE","ESCALATION","REOPENED"]);
export const createIncidentInput=z.strictObject({
 clientKey:uuid,category,severity,title:z.string().trim().min(8).max(180),
 description:z.string().trim().min(20).max(2000),
 subjectType:subjectType.nullable(),subjectId:uuid.nullable()
}).refine(x=>(x.subjectType===null)===(x.subjectId===null),{message:"Link a real subject type and ID together."});
export const transitionInput=z.strictObject({
 expectedVersion:z.number().int().min(1),
 action:z.enum(["INVESTIGATING","MITIGATED","CLOSED","OPEN"]),
 reasonCode:reason,
 note:z.string().trim().min(12).max(1500)
});
export const assignInput=z.strictObject({
 expectedVersion:z.number().int().min(1),
 assignedToId:uuid.nullable(),
 reasonCode:reason,
 note:z.string().trim().min(12).max(1500)
});
type Tx=Prisma.TransactionClient;
const opts={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:30000} as const;
async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>){
 try{return await db.$transaction(fn,opts);}
 catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code))
   throw new PublicError(409,"Another governance update has changed this record. Refresh before retrying.");
  throw error;
 }
}
async function lockSuperAdmin(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',id);
 const actor=await tx.account.findUnique({where:{id},select:{role:true,status:true}});
 if(actor?.role!=="SUPER_ADMIN"||actor.status!=="ACTIVE")
  throw new PublicError(403,"Only an active Super Admin can record governance decisions.");
}
async function lockIncident(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "governance_incidents" WHERE "id" = $1::uuid FOR UPDATE',id);
 const incident=await tx.governanceIncident.findUnique({where:{id}});
 if(!incident)throw new PublicError(404,"Governance incident not found.");
 return incident;
}
async function verifySubject(tx:Tx,type:z.infer<typeof subjectType>|null,id:string|null){
 if(type===null)return;
 if(!id)throw new PublicError(400,"A linked subject ID is required.");
 let record:null|{id:string}=null;
 switch(type){
  case "ACCOUNT":record=await tx.account.findUnique({where:{id},select:{id:true}});break;
  case "ORDER":record=await tx.order.findUnique({where:{id},select:{id:true}});break;
  case "BUYER_PAYMENT":record=await tx.paymentObligation.findUnique({where:{id},select:{id:true}});break;
  case "SUPPLIER_OBLIGATION":record=await tx.supplierObligation.findUnique({where:{id},select:{id:true}});break;
  case "SHIPMENT":record=await tx.shipment.findUnique({where:{id},select:{id:true}});break;
  case "SUPPORT_CASE":record=await tx.supportCase.findUnique({where:{id},select:{id:true}});break;
 }
 if(!record)throw new PublicError(404,"The referenced governance subject does not exist.");
}
export function linkedSubject(type:string|null,id:string|null){
 if(!type||!id)return null;
 switch(type){
  case "ACCOUNT":return "/admin/users/"+id;
  case "ORDER":return "/operations/orders/"+id;
  case "BUYER_PAYMENT":return "/operations/payments/"+id;
  case "SUPPLIER_OBLIGATION":return "/admin/settlements";
  case "SHIPMENT":return "/operations/fulfilment/shipments/"+id;
  case "SUPPORT_CASE":return "/support/cases/"+id;
  default:return null;
 }
}
export async function openGovernanceIncident(input:unknown){
 const value=createIncidentInput.parse(input);
 const {ctx,db}=await requireAdminApi("platform.governance.manage");
 return atomic(db,async tx=>{
  await lockSuperAdmin(tx,ctx.account.id);
  const prior=await tx.governanceIncident.findUnique({where:{clientKey:value.clientKey}});
  if(prior){
   if(prior.openedById!==ctx.account.id)throw new PublicError(409,"This submission key is already in use.");
   return {id:prior.id,reference:prior.reference,status:prior.status,version:prior.version,existing:true};
  }
  await verifySubject(tx,value.subjectType,value.subjectId);
  const id=randomUUID(),reference="INC-"+id.replaceAll("-","").toUpperCase();
  const incident=await tx.governanceIncident.create({data:{
   id,clientKey:value.clientKey,reference,openedById:ctx.account.id,
   category:value.category,severity:value.severity,title:value.title,
   description:value.description,subjectType:value.subjectType,subjectId:value.subjectId,
   events:{create:{actorId:ctx.account.id,toStatus:"OPEN",reasonCode:"DOCUMENTED_ACTION",
    note:"Governance case opened with documented facts; no source financial or operational state changed."}}
  }});
  await tx.auditEvent.create({data:{actorId:ctx.account.id,subjectId:incident.id,
   action:"GOVERNANCE_INCIDENT_OPENED",details:{category:incident.category,severity:incident.severity,subjectType:incident.subjectType}}});
  return {id:incident.id,reference:incident.reference,status:incident.status,version:incident.version,existing:false};
 });
}
export async function transitionGovernanceIncident(id:string,input:unknown){
 uuid.parse(id);const value=transitionInput.parse(input);
 const {ctx,db}=await requireAdminApi("platform.governance.manage");
 return atomic(db,async tx=>{
  await lockSuperAdmin(tx,ctx.account.id);
  const incident=await lockIncident(tx,id);
  if(incident.version!==value.expectedVersion)throw new PublicError(409,"The incident changed. Refresh before deciding.");
  const allowed:{[key:string]:readonly string[]}={
   OPEN:["INVESTIGATING"],INVESTIGATING:["MITIGATED"],MITIGATED:["CLOSED","INVESTIGATING"],CLOSED:["OPEN"]
  };
  if(!allowed[incident.status]?.includes(value.action))
   throw new PublicError(409,"Record an investigation and mitigation before closure; a closed incident requires explicit reopening.");
  if(value.action==="CLOSED"&&!["EXTERNAL_RESOLUTION","DOCUMENTED_ACTION","FALSE_POSITIVE"].includes(value.reasonCode))
   throw new PublicError(400,"Closure requires a documented resolution reason code.");
  const updated=await tx.governanceIncident.update({where:{id},data:{
   status:value.action,version:{increment:1},closedAt:value.action==="CLOSED"?new Date():null}});
  await tx.governanceIncidentEvent.create({data:{incidentId:id,actorId:ctx.account.id,
   fromStatus:incident.status,toStatus:value.action,reasonCode:value.reasonCode,note:value.note}});
  await tx.auditEvent.create({data:{actorId:ctx.account.id,subjectId:id,
   action:"GOVERNANCE_STATUS_CHANGED",details:{from:incident.status,to:value.action,reason:value.reasonCode}}});
  return {id:updated.id,status:updated.status,version:updated.version};
 });
}
export async function assignGovernanceIncident(id:string,input:unknown){
 uuid.parse(id);const value=assignInput.parse(input);
 const {ctx,db}=await requireAdminApi("platform.governance.manage");
 return atomic(db,async tx=>{
  await lockSuperAdmin(tx,ctx.account.id);
  const incident=await lockIncident(tx,id);
  if(incident.version!==value.expectedVersion)throw new PublicError(409,"The incident changed. Refresh before assigning.");
  if(incident.status==="CLOSED")throw new PublicError(409,"Reopen the case before reassigning.");
  if(incident.assignedToId===value.assignedToId)throw new PublicError(409,"The incident is already assigned this way.");
  if(value.assignedToId){
   const assignee=await tx.account.findUnique({where:{id:value.assignedToId},
    select:{role:true,status:true}});
   if(assignee?.role!=="SUPER_ADMIN"||assignee.status!=="ACTIVE")
    throw new PublicError(403,"Only an active Super Admin may own restricted governance incident investigations.");
  }
  const updated=await tx.governanceIncident.update({where:{id},data:{
   assignedToId:value.assignedToId,version:{increment:1}}});
  await tx.governanceIncidentEvent.create({data:{incidentId:id,actorId:ctx.account.id,
   fromStatus:incident.status,toStatus:incident.status,reasonCode:value.reasonCode,note:value.note}});
  await tx.auditEvent.create({data:{actorId:ctx.account.id,subjectId:id,
   action:"GOVERNANCE_INCIDENT_ASSIGNED",details:{assignedToId:value.assignedToId,reason:value.reasonCode}}});
  return {id:updated.id,status:updated.status,version:updated.version};
 });
}
