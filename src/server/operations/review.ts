import "server-only";
import { z } from "zod";
import { PublicError } from "@/server/auth/http";
import { requireActor } from "@/server/agriculture/policies";
import { hasPermission } from "@/server/admin/permissions";
import type { Prisma } from "@/generated/prisma/client";

export const caseKindSchema = z.enum(["verification", "supply"]);
const uuid = z.string().uuid();
const caseType = (kind: "verification" | "supply") =>
  kind === "verification" ? "FARMER_VERIFICATION" as const : "SUPPLY_DECLARATION" as const;

const claimSchema = z.object({
  override: z.boolean().optional().default(false),
  reason: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.override && (!value.reason || value.reason.length < 10))
    ctx.addIssue({code:"custom", path:["reason"], message:"Explain why you are taking over the case."});
});

const decisionSchema = z.object({
  decision: z.enum(["approve", "more_info", "reject"]),
  note: z.string().trim().min(5).max(2000),
  evidenceAcknowledged: z.literal("yes").optional(),
  evidenceVisitId: uuid.optional().or(z.literal("")),
  observedQuantity: z.preprocess(v=>v===""||v===undefined?undefined:v, z.coerce.number().positive().max(1000000000).optional()),
  observedUnit: z.enum(["KG", "TONNE", "BAG", "PIECE"]).optional().or(z.literal("")),
  conditionNote: z.string().trim().max(2000).optional(),
  specificationId: uuid.optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.decision !== "approve") return;
  if (value.evidenceAcknowledged !== "yes")
    ctx.addIssue({code:"custom", path:["evidenceAcknowledged"], message:"Review and acknowledge the evidence before approving."});
  if (value.observedQuantity !== undefined && Math.round(value.observedQuantity * 1000) !== value.observedQuantity * 1000)
    ctx.addIssue({code:"custom", path:["observedQuantity"], message:"Use at most three decimal places."});
});

type Tx = Prisma.TransactionClient;
async function lockReviewer(tx:Tx, id:string, permission:"operations.verification.review"|"operations.supply.review") {
  await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${id}::uuid FOR UPDATE`;
  const reviewer = await tx.account.findUnique({where:{id}, select:{role:true,status:true}});
  if (!reviewer || reviewer.status !== "ACTIVE" || !hasPermission(reviewer.role, permission))
    throw new PublicError(403, "Active Operations review access is required.");
  return reviewer;
}
async function lockCase(tx:Tx, kind:"verification"|"supply", id:string) {
  if (kind === "verification") {
    await tx.$queryRaw`SELECT "id" FROM "farmer_verifications" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const v=await tx.farmerVerification.findUnique({where:{id},select:{id:true,status:true}});
    if(!v)throw new PublicError(404,"Verification case not found.");
    if(v.status!=="PENDING_REVIEW")throw new PublicError(409,"Only pending cases can be assigned or reviewed.");
  } else {
    await tx.$queryRaw`SELECT "id" FROM "supply_declarations" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const s=await tx.supplyDeclaration.findUnique({where:{id},select:{id:true,status:true}});
    if(!s)throw new PublicError(404,"Supply case not found.");
    if(s.status!=="PENDING_REVIEW")throw new PublicError(409,"Only pending cases can be assigned or reviewed.");
  }
}
async function assertAssigned(tx:Tx, kind:"verification"|"supply", id:string, actorId:string) {
  const assignment=await tx.operationsReviewAssignment.findUnique({
    where:{kind_subjectId:{kind:caseType(kind),subjectId:id}}, select:{assignedToId:true}
  });
  if(assignment?.assignedToId!==actorId)
    throw new PublicError(409,"Claim this review case before making a decision. Another reviewer may currently own it.");
}

export async function claimOperationsCase(kind:unknown, recordId:unknown, input:unknown) {
  const type=caseKindSchema.parse(kind), id=uuid.parse(recordId), value=claimSchema.parse(input);
  const {account,db}=await requireActor("OPERATIONS");
  const permission=type==="verification"?"operations.verification.review":"operations.supply.review";
  if(!hasPermission(account.role,permission))throw new PublicError(403,"You cannot claim this review type.");
  return db.$transaction(async tx=>{
    const reviewer=await lockReviewer(tx,account.id,permission);
    await lockCase(tx,type,id);
    const key={kind:caseType(type),subjectId:id};
    const existing=await tx.operationsReviewAssignment.findUnique({where:{kind_subjectId:key}});
    if(existing?.assignedToId===account.id)return {id,assignedToId:account.id};
    if(existing && (!value.override || reviewer.role!=="SUPER_ADMIN"))
      throw new PublicError(409,"This case is assigned to another reviewer. Ask a Super Admin to reassign it.");
    if(value.override && reviewer.role!=="SUPER_ADMIN")throw new PublicError(403,"Only a Super Admin can take over a case.");
    if(value.override && !existing)throw new PublicError(409,"There is no existing assignment to take over. Claim normally.");
    await tx.operationsReviewAssignment.upsert({where:{kind_subjectId:key},
      create:{...key,assignedToId:account.id,assignedById:account.id},
      update:{assignedToId:account.id,assignedById:account.id,assignedAt:new Date()}});
    await tx.auditEvent.create({data:{actorId:account.id,action:existing?"REVIEW_CASE_REASSIGNED":"REVIEW_CASE_CLAIMED",subjectId:id,
      details:{kind:key.kind,previousReviewerId:existing?.assignedToId??null,reason:value.reason??null}}});
    return {id,assignedToId:account.id};
  },{timeout:30000,maxWait:10000});
}

export async function reviewFarmer(id:string, input:unknown) {
  uuid.parse(id);
  const value=decisionSchema.parse(input);
  const {account,db}=await requireActor("OPERATIONS");
  if(!hasPermission(account.role,"operations.verification.review"))throw new PublicError(403,"Verification review access required.");
  const next=value.decision==="approve"?"VERIFIED" as const:value.decision==="reject"?"REJECTED" as const:"MORE_INFO_REQUIRED" as const;
  return db.$transaction(async tx=>{
    await lockReviewer(tx,account.id,"operations.verification.review");
    await lockCase(tx,"verification",id);
    await assertAssigned(tx,"verification",id,account.id);
    const candidate=await tx.farmerVerification.findUniqueOrThrow({where:{id},select:{farmerId:true,status:true}});
    if(candidate.farmerId===account.id)throw new PublicError(403,"You cannot review your own farmer profile.");
    if(next==="VERIFIED"){
      const farms=await tx.farm.findMany({where:{farmerId:candidate.farmerId},select:{id:true}});
      if(!farms.length)throw new PublicError(409,"Farmer verification requires at least one registered farm.");
      const reports=await tx.fieldVisit.findMany({where:{farmerId:candidate.farmerId,farmId:{in:farms.map(f=>f.id)},
        status:"REVIEWED",reviewDecision:"ACCEPT_REPORT",purpose:{in:["FARMER_VERIFICATION","FARM_ASSESSMENT"]},
        evidence:{some:{status:"READY"}}},select:{farmId:true}});
      const covered=new Set(reports.map(report=>report.farmId));
      if(farms.some(farm=>!covered.has(farm.id)))
        throw new PublicError(409,"Every registered farm needs an accepted Field Agent verification/assessment report with private evidence before approval.");
    }
    const changed=await tx.farmerVerification.updateMany({where:{id,status:"PENDING_REVIEW"},
      data:{status:next,feedback:value.note,reviewedById:account.id,reviewedAt:new Date()}});
    if(changed.count!==1)throw new PublicError(409,"This case changed. Reload before deciding.");
    await tx.farmerVerificationEvent.create({data:{verificationId:id,actorId:account.id,status:next,note:value.note}});
    await tx.auditEvent.create({data:{actorId:account.id,action:"FARMER_VERIFICATION_REVIEWED",subjectId:id,
      details:{decision:next,farmerId:candidate.farmerId}}});
    return {id,status:next};
  },{timeout:30000,maxWait:10000});
}

export async function reviewSupply(id:string, input:unknown) {
  uuid.parse(id);
  const value=decisionSchema.parse(input);
  const {account,db}=await requireActor("OPERATIONS");
  if(!hasPermission(account.role,"operations.supply.review"))throw new PublicError(403,"Supply review access required.");
  const next=value.decision==="approve"?"APPROVED" as const:value.decision==="reject"?"REJECTED" as const:"MORE_INFO_REQUIRED" as const;
  return db.$transaction(async tx=>{
    await lockReviewer(tx,account.id,"operations.supply.review");
    await lockCase(tx,"supply",id);
    await assertAssigned(tx,"supply",id,account.id);
    const supply=await tx.supplyDeclaration.findUniqueOrThrow({where:{id},select:{farmerId:true,farmId:true,commodityId:true,quantity:true,unit:true,packaging:true}});
    if(supply.farmerId===account.id)throw new PublicError(403,"You cannot review your own supply.");
    if(next==="APPROVED"){
      const farmer=await tx.farmerVerification.findUnique({where:{farmerId:supply.farmerId},select:{status:true}});
      if(farmer?.status!=="VERIFIED")throw new PublicError(409,"Farmer verification must remain approved before supply approval.");
      if(!value.evidenceVisitId || !value.observedUnit || value.observedQuantity===undefined || !value.conditionNote || value.conditionNote.length<20)
        throw new PublicError(400,"Choose an accepted inspection report and record observed quantity, unit and a condition assessment of at least 20 characters.");
      if(value.observedUnit!==supply.unit)
        throw new PublicError(409,"The observed unit must match the farmer's declaration. Request a correction before approval.");
      if(value.observedQuantity!==Number(supply.quantity.toString()))
        throw new PublicError(409,"Observed quantity differs from declared quantity. Request a farmer correction before approving.");
      if(supply.unit==="BAG" && (!supply.packaging || supply.packaging.trim().length<5))
        throw new PublicError(409,"Bag supply requires an explicit package-size description.");
      const report=await tx.fieldVisit.findFirst({where:{id:value.evidenceVisitId,farmerId:supply.farmerId,farmId:supply.farmId,
        purpose:{in:["PRODUCTION_OBSERVATION","CROP_ASSESSMENT"]},status:"REVIEWED",reviewDecision:"ACCEPT_REPORT",
        evidence:{some:{status:"READY"}}},select:{id:true}});
      if(!report)throw new PublicError(409,"Select an accepted field inspection of this farm with available private evidence.");
      if(value.specificationId){
        const specification=await tx.commoditySpecification.findFirst({where:{id:value.specificationId,commodityId:supply.commodityId},select:{id:true}});
        if(!specification)throw new PublicError(400,"Selected commodity specification does not belong to this supply.");
      }
      await tx.supplyInspectionAssessment.create({data:{supplyId:id,reviewerId:account.id,evidenceVisitId:report.id,
        observedQuantity:value.observedQuantity,observedUnit:value.observedUnit,conditionNote:value.conditionNote,
        specificationId:value.specificationId||null}});
    }
    const changed=await tx.supplyDeclaration.updateMany({where:{id,status:"PENDING_REVIEW"},
      data:{status:next,reviewedById:account.id,reviewedAt:new Date(),feedback:value.note}});
    if(changed.count!==1)throw new PublicError(409,"This supply changed. Reload before deciding.");
    await tx.supplyReviewEvent.create({data:{supplyId:id,actorId:account.id,status:next,note:value.note}});
    await tx.auditEvent.create({data:{actorId:account.id,action:"SUPPLY_REVIEWED",subjectId:id,
      details:{decision:next,farmerId:supply.farmerId,inspectionVisitId:next==="APPROVED"?value.evidenceVisitId:null}}});
    return {id,status:next};
  },{timeout:30000,maxWait:10000});
}
