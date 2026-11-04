import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {PublicError,requireConfig} from "@/server/auth/http";
import {getAccountContext} from "@/server/auth/context";
import {getPrisma} from "@/server/db/prisma";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {id} from "./validation";
import {atomic,lockAccount,shipmentRecord} from "./common";

const BUCKET=process.env.SHIPMENT_EVIDENCE_BUCKET||"shipment-evidence";
const LIMIT=10*1024*1024;
const accepted:Record<string,{ext:string;matches:(x:Uint8Array)=>boolean}>={
 "image/jpeg":{ext:"jpg",matches:x=>x.length>3&&x[0]===255&&x[1]===216&&x[2]===255},
 "image/png":{ext:"png",matches:x=>x.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>x[i]===v)},
 "image/webp":{ext:"webp",matches:x=>x.length>=12&&String.fromCharCode(...x.slice(0,4))==="RIFF"&&String.fromCharCode(...x.slice(8,12))==="WEBP"},
 "application/pdf":{ext:"pdf",matches:x=>x.length>=5&&String.fromCharCode(...x.slice(0,5))==="%PDF-"}
};
const name=(v:string)=>(v.split(/[\\/]/).pop()||"evidence").replace(/[^a-zA-Z0-9._() -]/g,"_").slice(0,180);

async function actor(){
 requireConfig();
 const ctx=await getAccountContext();
 if(!ctx||ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at)
  throw new PublicError(401,"Verified active account required.");
 if(!["BUYER","OPERATIONS","SUPER_ADMIN"].includes(ctx.account.role))
  throw new PublicError(403,"This account may not view or upload shipment evidence.");
 return ctx;
}
async function requireScope(tx:Prisma.TransactionClient,actorId:string,role:string,shipmentId:string){
 await lockAccount(tx,actorId,[role]);
 const {order,shipment}=await shipmentRecord(tx,shipmentId);
 if(role==="BUYER"){
  const member=await tx.buyerMembership.findUnique({where:{accountId:actorId}});
  if(!member||member.organizationId!==order.organizationId||member.role!=="OWNER")
   throw new PublicError(404,"Shipment not found.");
 }else if(role!=="SUPER_ADMIN"&&order.quotation.request.assignment?.assignedToId!==actorId)
  throw new PublicError(404,"Shipment not found.");
 return {order,shipment};
}

export async function uploadShipmentEvidence(shipmentId:string,file:File){
 id.parse(shipmentId);const {account}=await actor(),db=getPrisma();
 if(file.size<1||file.size>LIMIT)throw new PublicError(413,"Evidence must be between one byte and 10 MB.");
 const fmt=accepted[file.type];
 if(!fmt)throw new PublicError(415,"Only JPEG, PNG, WebP and PDF evidence is supported.");
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!fmt.matches(bytes))throw new PublicError(415,"File content does not match its declared media type.");
 const evidenceId=randomUUID(),objectPath=shipmentId+"/"+evidenceId+"."+fmt.ext;
 await atomic(db,async tx=>{
  const {shipment}=await requireScope(tx,account.id,account.role,shipmentId);
  if(["CANCELLED"].includes(shipment.status))throw new PublicError(409,"Cancelled shipments cannot accept evidence.");
  if(account.role==="BUYER"&&(!shipment.deliveredAt||Date.now()-shipment.deliveredAt.getTime()>7*86400000))
   throw new PublicError(409,"Buyer evidence can be added only within seven days of a reported delivery.");
  await tx.shipmentEvidence.create({data:{id:evidenceId,shipmentId,uploadedById:account.id,
   objectPath,originalName:name(file.name),contentType:file.type,sizeBytes:file.size,status:"UPLOADING"}});
 });
 const storage=createSupabaseAdminClient().storage.from(BUCKET);
 try{
  const upload=await storage.upload(objectPath,Buffer.from(bytes),{contentType:file.type,upsert:false,cacheControl:"0"});
  if(upload.error)throw new Error("Private evidence storage failed.");
  await atomic(db,async tx=>{
   await requireScope(tx,account.id,account.role,shipmentId);
   const changed=await tx.shipmentEvidence.updateMany({where:{id:evidenceId,shipmentId,status:"UPLOADING"},
    data:{status:"READY"}});
   if(changed.count!==1)throw new PublicError(409,"Evidence state changed during upload.");
   await tx.auditEvent.create({data:{actorId:account.id,subjectId:shipmentId,action:"SHIPMENT_EVIDENCE_UPLOADED",
    details:{evidenceId,contentType:file.type,sizeBytes:file.size}}});
  });
 }catch(error){
  await storage.remove([objectPath]).catch(()=>undefined);
  await db.shipmentEvidence.deleteMany({where:{id:evidenceId,status:"UPLOADING"}}).catch(()=>undefined);
  if(error instanceof PublicError)throw error;
  throw new PublicError(503,"Private evidence storage is unavailable. Review the storage bucket and retry.");
 }
 return {id:evidenceId,status:"READY",originalName:name(file.name)};
}

export async function shipmentEvidenceSignedUrl(shipmentId:string,evidenceId:string){
 id.parse(shipmentId);id.parse(evidenceId);
 const {account}=await actor(),db=getPrisma();
 const item=await atomic(db,async tx=>{
  await requireScope(tx,account.id,account.role,shipmentId);
  return tx.shipmentEvidence.findFirst({where:{id:evidenceId,shipmentId,status:"READY"},
   select:{objectPath:true}});
 });
 if(!item)throw new PublicError(404,"Evidence file not found.");
 const signed=await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(item.objectPath,60);
 if(signed.error||!signed.data?.signedUrl)throw new PublicError(503,"Private evidence is not available.");
 return signed.data.signedUrl;
}
