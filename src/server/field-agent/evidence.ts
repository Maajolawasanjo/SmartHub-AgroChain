import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicError } from "@/server/auth/http";
import { getPrisma } from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireFieldAgentApi } from "./guard";
import { assertAgentCanReadVisit } from "./actions";

const MAX_FILE_BYTES=10*1024*1024;
const BUCKET=process.env.FIELD_EVIDENCE_BUCKET||"field-visit-evidence";
const ACCEPTED:Record<string,{extension:string;matches:(bytes:Uint8Array)=>boolean}>={
  "image/jpeg":{extension:"jpg",matches:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  "image/png":{extension:"png",matches:b=>b.length>=8&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47&&b[4]===0x0d&&b[5]===0x0a&&b[6]===0x1a&&b[7]===0x0a},
  "image/webp":{extension:"webp",matches:b=>b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP"},
  "application/pdf":{extension:"pdf",matches:b=>b.length>=5&&String.fromCharCode(...b.slice(0,5))==="%PDF-"},
};
const editable=["DRAFT","IN_PROGRESS","RETURNED"] as const;

async function lockAgent(tx:Prisma.TransactionClient,agentId:string){
  await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${agentId}::uuid FOR UPDATE`;
  const account=await tx.account.findUnique({where:{id:agentId},select:{id:true,role:true,status:true}});
  if(!account||account.role!=="FIELD_AGENT"||account.status!=="ACTIVE")throw new PublicError(403,"Active Field Agent access is required.");
}
async function editableVisit(tx:Prisma.TransactionClient,agentId:string,visitId:string){
  await tx.$queryRaw`SELECT "id" FROM "field_visits" WHERE "id" = ${visitId}::uuid FOR UPDATE`;
  const visit=await tx.fieldVisit.findFirst({where:{id:visitId,fieldAgentId:agentId},select:{id:true,farmId:true,status:true}});
  if(!visit)throw new PublicError(404,"Field visit not found.");
  await tx.$queryRaw`SELECT "id" FROM "farms" WHERE "id" = ${visit.farmId}::uuid FOR UPDATE`;
  const farm=await tx.farm.findUnique({where:{id:visit.farmId},select:{state:true}});
  if(!farm)throw new PublicError(404,"Farm not found.");
  const assignment=await tx.fieldAgentAssignment.findFirst({where:{fieldAgentId:agentId,state:farm.state,active:true},select:{id:true}});
  if(!assignment)throw new PublicError(404,"Field visit is outside your active assignment scope.");
  if(!editable.includes(visit.status as typeof editable[number]))throw new PublicError(409,"Evidence can only be changed before report submission.");
  return visit;
}
function safeName(name:string){
  const base=name.split(/[\\/]/).pop()||"evidence";
  return base.replace(/[^A-Za-z0-9._() -]/g,"_").slice(0,180)||"evidence";
}

export async function uploadFieldVisitEvidence(visitId:string,file:File,caption:string|null){
  const {ctx,db}=await requireFieldAgentApi("field.evidence.submit");
  if(!file||typeof file.arrayBuffer!=="function")throw new PublicError(400,"Choose an evidence file.");
  if(file.size<1||file.size>MAX_FILE_BYTES)throw new PublicError(413,"Evidence must be between 1 byte and 10 MB.");
  const mime=ACCEPTED[file.type];
  if(!mime)throw new PublicError(415,"Upload a JPEG, PNG, WebP image or PDF document.");
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!mime.matches(bytes))throw new PublicError(415,"The file contents do not match the selected file type.");
  const evidenceId=randomUUID();
  const objectPath=`${visitId}/${evidenceId}.${mime.extension}`;
  await db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    await editableVisit(tx,ctx.account.id,visitId);
    await tx.fieldVisitEvidence.create({data:{id:evidenceId,visitId,uploadedById:ctx.account.id,objectPath,originalName:safeName(file.name),contentType:file.type,sizeBytes:file.size,caption:caption?.trim()||null,status:"UPLOADING"}});
  },{timeout:30000,maxWait:10000});

  let storage:ReturnType<ReturnType<typeof createSupabaseAdminClient>["storage"]["from"]>;
  try{
    storage=createSupabaseAdminClient().storage.from(BUCKET);
    const uploaded=await storage.upload(objectPath,Buffer.from(bytes),{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(uploaded.error)throw new Error("storage upload failed");
  }catch{
    await db.fieldVisitEvidence.deleteMany({where:{id:evidenceId,status:"UPLOADING"}});
    throw new PublicError(503,"Evidence storage is not ready. Please retry after the storage service is configured.");
  }
  try{
    await db.$transaction(async tx=>{
      await lockAgent(tx,ctx.account.id);
      await editableVisit(tx,ctx.account.id,visitId);
      const changed=await tx.fieldVisitEvidence.updateMany({where:{id:evidenceId,visitId,uploadedById:ctx.account.id,status:"UPLOADING"},data:{status:"READY"}});
      if(changed.count!==1)throw new PublicError(409,"Evidence upload state changed. Refresh the visit.");
      const visit=await tx.fieldVisit.findUniqueOrThrow({where:{id:visitId},select:{status:true}});
      await tx.fieldVisitEvent.create({data:{visitId,actorId:ctx.account.id,eventType:"EVIDENCE_ADDED",status:visit.status,note:"Evidence attached"}});
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_EVIDENCE_ADDED",subjectId:visitId,details:{evidenceId,contentType:file.type,sizeBytes:file.size}}});
    },{timeout:30000,maxWait:10000});
  }catch(error){
    await storage.remove([objectPath]).catch(()=>({error:true}));
    await db.fieldVisitEvidence.deleteMany({where:{id:evidenceId,status:{in:["UPLOADING","READY"]}}});
    throw error;
  }
  return {id:evidenceId,originalName:safeName(file.name),contentType:file.type,sizeBytes:file.size,caption:caption?.trim()||null,status:"READY"};
}

export async function removeFieldVisitEvidence(visitId:string,evidenceId:string){
  const {ctx,db}=await requireFieldAgentApi("field.evidence.submit");
  const record=await db.$transaction(async tx=>{
    await lockAgent(tx,ctx.account.id);
    await editableVisit(tx,ctx.account.id,visitId);
    const evidence=await tx.fieldVisitEvidence.findFirst({where:{id:evidenceId,visitId,uploadedById:ctx.account.id}});
    if(!evidence)throw new PublicError(404,"Evidence not found.");
    const stale=evidence.updatedAt.getTime()<Date.now()-15*60*1000;
    if((evidence.status==="UPLOADING"||evidence.status==="DELETING")&&!stale)throw new PublicError(409,"Evidence is still being processed. If it remains stuck for 15 minutes, retry its removal.");
    const changed=await tx.fieldVisitEvidence.updateMany({where:{id:evidenceId,visitId,status:evidence.status},data:{status:"DELETING"}});
    if(changed.count!==1)throw new PublicError(409,"Evidence changed. Refresh and try again.");
    return evidence;
  },{timeout:30000,maxWait:10000});

  if(record.status!=="FAILED"){
    try{
      const removed=await createSupabaseAdminClient().storage.from(BUCKET).remove([record.objectPath]);
      if(removed.error)throw new Error("storage removal failed");
    }catch{
      await db.fieldVisitEvidence.updateMany({where:{id:evidenceId,visitId,status:"DELETING"},data:{status:record.status}});
      throw new PublicError(503,"Evidence could not be removed from private storage. Please retry.");
    }
  }
  try{
    await db.$transaction(async tx=>{
      await lockAgent(tx,ctx.account.id);
      const visit=await editableVisit(tx,ctx.account.id,visitId);
      const deleted=await tx.fieldVisitEvidence.deleteMany({where:{id:evidenceId,visitId,uploadedById:ctx.account.id,status:"DELETING"}});
      if(deleted.count!==1)throw new PublicError(409,"Evidence changed. Refresh and try again.");
      await tx.fieldVisitEvent.create({data:{visitId,actorId:ctx.account.id,eventType:"EVIDENCE_REMOVED",status:visit.status,note:"Evidence removed before submission"}});
      await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_VISIT_EVIDENCE_REMOVED",subjectId:visitId,details:{evidenceId}}});
    },{timeout:30000,maxWait:10000});
  }catch(error){
    await db.fieldVisitEvidence.updateMany({where:{id:evidenceId,visitId,status:"DELETING"},data:{status:"FAILED"}});
    throw error;
  }
  return {id:evidenceId};
}

export async function fieldEvidenceRedirect(visitId:string,evidenceId:string,agentId:string){
  await assertAgentCanReadVisit(visitId,agentId);
  const evidence=await getPrisma().fieldVisitEvidence.findFirst({where:{id:evidenceId,visitId,status:"READY"},select:{objectPath:true}});
  if(!evidence)throw new PublicError(404,"Evidence not found.");
  const {data,error}=await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(evidence.objectPath,60,{download:true});
  if(error||!data?.signedUrl)throw new PublicError(503,"Private evidence is temporarily unavailable.");
  return data.signedUrl;
}

export async function operationsEvidenceRedirect(visitId:string,evidenceId:string){
  const evidence=await getPrisma().fieldVisitEvidence.findFirst({where:{id:evidenceId,visitId,status:"READY",visit:{status:{in:["SUBMITTED","REVIEWED","RETURNED"]}}},select:{objectPath:true}});
  if(!evidence)throw new PublicError(404,"Evidence not found.");
  const {data,error}=await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(evidence.objectPath,60,{download:true});
  if(error||!data?.signedUrl)throw new PublicError(503,"Private evidence is temporarily unavailable.");
  return data.signedUrl;
}

