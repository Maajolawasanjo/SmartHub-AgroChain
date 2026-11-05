import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {z} from "zod";
import {PublicError} from "@/server/auth/http";
import {getPrisma} from "@/server/db/prisma";
import {requireWorkspaceAccount,publishInboxEvent,uuid,type Tx} from "./inbox";

const category=z.enum(["SOURCING","PAYMENTS","DELIVERY","SUPPLIER_SETTLEMENT","ACCOUNT","OTHER"]);
const create=z.strictObject({clientKey:uuid,category,subject:z.string().trim().min(6).max(160),
 message:z.string().trim().min(12).max(4000)});
const reply=z.strictObject({clientKey:uuid,body:z.string().trim().min(1).max(4000),
 internal:z.boolean().default(false)});
const command=z.strictObject({action:z.enum(["claim","reopen","resolve","close","await_customer","resume"]),
 note:z.string().trim().min(10).max(1000)});
const cfg={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>){
 try{return await db.$transaction(fn,cfg);}
 catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code))
   throw new PublicError(409,"Support conversation changed concurrently. Refresh and retry.");
  throw error;
 }
}
async function lockAccount(tx:Tx,actorId:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',actorId);
 const account=await tx.account.findUnique({where:{id:actorId},select:{id:true,role:true,status:true}});
 if(!account||account.status!=="ACTIVE")throw new PublicError(403,"Account is not active.");
 return account;
}
async function lockCase(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "support_cases" WHERE "id" = $1::uuid FOR UPDATE',id);
 const row=await tx.supportCase.findUnique({where:{id}});
 if(!row)throw new PublicError(404,"Support case not found.");
 return row;
}
const isStaff=(role:string)=>role==="OPERATIONS"||role==="SUPER_ADMIN";
const path=(id:string)=>"/support/cases/"+id;
export async function openSupportCase(input:unknown){
 const value=create.parse(input);const {account,db}=await requireWorkspaceAccount();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id);
  const old=await tx.supportCase.findUnique({where:{clientKey:value.clientKey}});
  if(old){
   if(old.openedById!==account.id)throw new PublicError(409,"This submission key belongs to a different case.");
   return {id:old.id,reference:old.reference,status:old.status,existing:true};
  }
  const id=randomUUID(),reference="SUP-"+id.replaceAll("-","").toUpperCase();
  const row=await tx.supportCase.create({data:{id,clientKey:value.clientKey,reference,
   openedById:account.id,category:value.category,subject:value.subject,
   messages:{create:{clientKey:randomUUID(),authorId:account.id,body:value.message,internal:false}}}});
  const staff=await tx.account.findMany({where:{role:{in:["OPERATIONS","SUPER_ADMIN"]},status:"ACTIVE"},select:{id:true}});
  await publishInboxEvent(tx,{eventKey:"support:open:"+row.id,eventType:"SUPPORT_CASE_OPENED",actorId:account.id,subjectId:row.id,
   recipients:staff.filter(s=>s.id!==account.id).map(s=>({accountId:s.id,category:"SUPPORT",title:"New support case",
    body:row.reference+" · "+row.category.replaceAll("_"," "),actionPath:path(row.id)}))});
  await tx.auditEvent.create({data:{actorId:account.id,subjectId:row.id,action:"SUPPORT_CASE_CREATED",details:{category:row.category}}});
  return {id:row.id,reference:row.reference,status:row.status,existing:false};
 });
}
export async function replySupportCase(caseId:string,input:unknown){
 uuid.parse(caseId);const value=reply.parse(input);const {account,db}=await requireWorkspaceAccount();
 return atomic(db,async tx=>{
  const actor=await lockAccount(tx,account.id),row=await lockCase(tx,caseId);
  const staff=isStaff(actor.role),owner=row.openedById===account.id;
  if(!staff&&!owner)throw new PublicError(404,"Support case not found.");
  if(staff&&!owner&&actor.role!=="SUPER_ADMIN"&&row.assignedToId!==account.id)
   throw new PublicError(403,"Claim this support case before sending a staff response.");
  if(value.internal&&!staff)throw new PublicError(403,"Private internal notes are for authorized staff only.");
  if(row.status==="CLOSED")throw new PublicError(409,"This support case is closed. Open a new case or request reopening.");
  const previous=await tx.supportMessage.findUnique({where:{clientKey:value.clientKey}});
  if(previous){
   if(previous.caseId!==caseId||previous.authorId!==account.id)throw new PublicError(409,"Message submission key conflict.");
   return {id:previous.id,status:row.status,existing:true};
  }
  const message=await tx.supportMessage.create({data:{caseId,authorId:account.id,body:value.body,internal:value.internal,clientKey:value.clientKey}});
  const newStatus=value.internal?row.status:staff&&!owner?"AWAITING_CUSTOMER":"IN_PROGRESS";
  const updated=await tx.supportCase.update({where:{id:caseId},data:{status:newStatus}});
  if(!value.internal){
   const recipients=staff&&!owner?[row.openedById]:
    row.assignedToId?[row.assignedToId]:
    (await tx.account.findMany({where:{role:{in:["OPERATIONS","SUPER_ADMIN"]},status:"ACTIVE"},select:{id:true}})).map(a=>a.id);
   await publishInboxEvent(tx,{eventKey:"support:message:"+message.id,eventType:"SUPPORT_MESSAGE_POSTED",actorId:account.id,subjectId:row.id,
    recipients:recipients.filter(id=>id!==account.id).map(accountId=>({accountId,category:"SUPPORT",
     title:"Support case updated",body:row.reference+" has a new reply.",actionPath:path(row.id)}))});
  }
  await tx.auditEvent.create({data:{actorId:account.id,subjectId:row.id,action:value.internal?"SUPPORT_INTERNAL_NOTE":"SUPPORT_MESSAGE_POSTED",
   details:{messageId:message.id,status:updated.status}}});
  return {id:message.id,status:updated.status,existing:false};
 });
}
export async function changeSupportCase(caseId:string,input:unknown){
 uuid.parse(caseId);const value=command.parse(input);const {account,db}=await requireWorkspaceAccount();
 return atomic(db,async tx=>{
  const actor=await lockAccount(tx,account.id),row=await lockCase(tx,caseId);
  const staff=isStaff(actor.role),owner=row.openedById===account.id;
  if(!owner&&!staff)throw new PublicError(404,"Support case not found.");
  let state=row.status;
  let assigned=row.assignedToId;
  if(value.action==="claim"){
   if(!staff)throw new PublicError(403,"Only staff may claim cases.");
   if(row.status==="CLOSED"||(row.assignedToId&&row.assignedToId!==account.id))
    throw new PublicError(409,"Case is closed or assigned to another agent.");
   assigned=account.id;state="IN_PROGRESS";
  }else if(value.action==="reopen"){
   if(!owner||row.status!=="RESOLVED")throw new PublicError(403,"Only the case owner may reopen a resolved case.");
   state="OPEN";assigned=null;
  }else{
   if(!staff)throw new PublicError(403,"Only staff may change support workflow status.");
   if(actor.role!=="SUPER_ADMIN"&&assigned!==account.id)
    throw new PublicError(403,"The assigned staff member must manage this support case.");
   const to={resolve:"RESOLVED",close:"CLOSED",await_customer:"AWAITING_CUSTOMER",resume:"IN_PROGRESS"} as const;
   state=to[value.action];
   if(row.status==="CLOSED"||row.status===state)throw new PublicError(409,"Support case cannot transition from its current state.");
   if(state==="CLOSED"&&row.status!=="RESOLVED")throw new PublicError(409,"Resolve the case before closing it.");
  }
  await tx.supportCase.update({where:{id:caseId},data:{status:state,assignedToId:assigned,closedAt:state==="CLOSED"?new Date():null}});
  const notify=owner&&value.action==="reopen"?(await tx.account.findMany({
   where:{role:{in:["OPERATIONS","SUPER_ADMIN"]},status:"ACTIVE"},select:{id:true}})).map(a=>a.id):
   staff&&row.openedById!==account.id?[row.openedById]:[];
  await publishInboxEvent(tx,{eventKey:"support:state:"+row.id+":"+state+":"+Date.now(),
   eventType:"SUPPORT_CASE_STATUS",actorId:account.id,subjectId:row.id,
   recipients:notify.map(accountId=>({accountId,category:"SUPPORT",title:"Support case status",
    body:row.reference+" · "+state.replaceAll("_"," "),actionPath:path(row.id)}))});
  await tx.auditEvent.create({data:{actorId:account.id,subjectId:row.id,action:"SUPPORT_CASE_"+state,details:{reason:value.note,assignedToId:assigned}}});
  return {id:row.id,status:state,assignedToId:assigned};
 });
}
export async function supportCaseList(account:{id:string;role:string}){
 return getPrisma().supportCase.findMany({where:isStaff(account.role)?{}:{openedById:account.id},
  orderBy:{updatedAt:"desc"},take:80,
  select:{id:true,reference:true,openedById:true,assignedToId:true,category:true,subject:true,status:true,updatedAt:true,
   openedBy:{select:{fullName:true}}}});
}
export async function supportCaseDetail(id:string,account:{id:string;role:string}){
 uuid.parse(id);
 const staff=isStaff(account.role);
 return getPrisma().supportCase.findFirst({where:{id,...(staff?{}:{openedById:account.id})},
  include:{openedBy:{select:{fullName:true,role:true}},assignedTo:{select:{fullName:true}},
   messages:{where:staff?{}:{internal:false},orderBy:{createdAt:"asc"},take:120,
    include:{author:{select:{fullName:true,role:true}}}}}});
}
