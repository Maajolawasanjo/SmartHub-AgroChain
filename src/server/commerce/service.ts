import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {requireActor} from "@/server/agriculture/policies";
import {requireBuyerApi} from "@/server/buyer/guard";
import {hasPermission} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";
import {proposeMatch,farmerRespond,prepareQuotation,transitionQuotation,decideQuotation,uid} from "./validation";

type Tx=Prisma.TransactionClient;
function conflict(message:string):never{throw new PublicError(409,message);}
function invalid(message:string):never{throw new PublicError(400,message);}
const serial={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>):Promise<T>{
 try{return await db.$transaction(fn,serial);}
 catch(e){
  if(e instanceof Prisma.PrismaClientKnownRequestError&&["P2002","P2034"].includes(e.code))conflict("Record was changed by another action. Refresh and retry.");
  throw e;
 }
}
async function audit(tx:Tx,actorId:string,subjectId:string,action:string,details:Record<string,unknown>={}){
 await tx.auditEvent.create({data:{actorId,subjectId,action,details:details as Prisma.InputJsonValue}});
}
async function operations(){
 const ctx=await requireActor("OPERATIONS");
 if(!hasPermission(ctx.account.role,"operations.requests.review"))throw new PublicError(403,"Operations sourcing access required.");
 return ctx;
}
async function ensureAssigned(tx:Tx,requestId:string,actorId:string){
 const request=await tx.buyerRequest.findUnique({where:{id:requestId},include:{assignment:true}});
 if(!request||request.status!=="SOURCING_IN_PROGRESS"||!request.submittedAt)conflict("The request must be actively in sourcing.");
 if(request.assignment?.assignedToId!==actorId)throw new PublicError(403,"Claim the sourcing case before preparing matches or quotes.");
 return request;
}
async function validateCandidate(tx:Tx,requestLineId:string,supplyId:string,quantity:Prisma.Decimal){
 const line=await tx.buyerRequestLine.findUnique({where:{id:requestLineId},include:{request:true}});
 const supply=await tx.supplyDeclaration.findUnique({where:{id:supplyId},include:{qualityAssessments:{orderBy:{createdAt:"desc"},take:1}}});
 if(!line||!supply)throw new PublicError(404,"Buyer line or supply declaration was not found.");
 if(!line.commodityId||line.commodityId!==supply.commodityId)conflict("Only catalogue-linked matching commodities are eligible; unlisted products need Operations classification.");
 if(line.unit!==supply.unit)conflict("Request and supply units differ. A conversion and approval is required.");
 if(supply.status!=="APPROVED")conflict("Only approved physical supply is eligible.");
 const farmer=await tx.account.findUnique({where:{id:supply.farmerId},select:{role:true,status:true}});
 const verified=await tx.farmerVerification.findUnique({where:{farmerId:supply.farmerId},select:{status:true}});
 if(!farmer||farmer.role!=="FARMER"||farmer.status!=="ACTIVE"||verified?.status!=="VERIFIED")conflict("The farmer is not currently eligible.");
 const assessment=supply.qualityAssessments[0];
 if(!assessment||assessment.observedUnit!==supply.unit)conflict("Physical quality and quantity evidence must be reviewed before matching.");
 if(line.specificationId&&assessment.specificationId!==line.specificationId)conflict("The most recent inspection does not establish the requested grade.");
 if(quantity.lte(0)||quantity.gt(line.quantity)||quantity.gt(supply.quantity)||quantity.gt(assessment.observedQuantity))
  conflict("The proposed quantity exceeds requested or independently observed supply.");
 return {line,supply,assessment};
}
async function verifiedMatch(tx:Tx,id:string,requestId:string){
 const match=await tx.matchProposal.findUnique({where:{id},include:{requestLine:true,supply:true,interests:true}});
 if(!match||match.requestLine.requestId!==requestId||match.status!=="INTERESTED"||!match.interests.some(i=>i.response==="INTERESTED"&&i.farmerId===match.supply.farmerId))
  conflict("Only a current, interested farmer's match can support a quotation.");
 const result=await validateCandidate(tx,match.requestLineId,match.supplyId,match.quantity);
 return {match,...result};
}
export async function createMatch(input:unknown){
 const value=proposeMatch.parse(input);const {account,db}=await operations();
 if(account.role!=="OPERATIONS")throw new PublicError(403,"An Operations reviewer must propose sourcing candidates.");
 const amount=new Prisma.Decimal(value.quantity);
 return atomic(db,async tx=>{
  const line=await tx.buyerRequestLine.findUnique({where:{id:value.requestLineId}});
  if(!line)throw new PublicError(404,"Buyer request line not found.");
  await ensureAssigned(tx,line.requestId,account.id);
  await validateCandidate(tx,line.id,value.supplyId,amount);
  const match=await tx.matchProposal.create({data:{requestLineId:line.id,supplyId:value.supplyId,quantity:amount,unit:line.unit,createdById:account.id,note:value.note||null}});
  await audit(tx,account.id,match.id,"MATCH_CANDIDATE_CREATED",{requestLineId:line.id,supplyId:value.supplyId});
  return {id:match.id,status:match.status};
 });
}
export async function inviteFarmer(matchId:string){
 uid.parse(matchId);const {account,db}=await operations();
 if(account.role!=="OPERATIONS")throw new PublicError(403,"An Operations reviewer must invite the farmer.");
 return atomic(db,async tx=>{
  const match=await tx.matchProposal.findUnique({where:{id:matchId},include:{requestLine:true}});
  if(!match)throw new PublicError(404,"Candidate not found.");
  await ensureAssigned(tx,match.requestLine.requestId,account.id);
  if(match.status!=="CANDIDATE")conflict("Only new candidate matches can be invited.");
  await validateCandidate(tx,match.requestLineId,match.supplyId,match.quantity);
  const updated=await tx.matchProposal.updateMany({where:{id:matchId,status:"CANDIDATE"},data:{status:"INVITED",invitedAt:new Date()}});
  if(updated.count!==1)conflict("This invitation has changed.");
  await audit(tx,account.id,matchId,"MATCH_FARMER_INVITED");
  return {id:matchId,status:"INVITED"};
 });
}
export async function respondToOpportunity(matchId:string,input:unknown){
 uid.parse(matchId);const value=farmerRespond.parse(input);const {account,db}=await requireActor("FARMER");
 return atomic(db,async tx=>{
  const match=await tx.matchProposal.findUnique({where:{id:matchId},include:{supply:true,requestLine:true}});
  if(!match||match.supply.farmerId!==account.id)throw new PublicError(404,"Opportunity not found.");
  if(match.status!=="INVITED")conflict("This opportunity is no longer awaiting a response.");
  const request=await tx.buyerRequest.findUnique({where:{id:match.requestLine.requestId}});
  if(request?.status!=="SOURCING_IN_PROGRESS")conflict("This sourcing request is no longer active.");
  await validateCandidate(tx,match.requestLineId,match.supplyId,match.quantity);
  await tx.opportunityInterest.create({data:{matchId,farmerId:account.id,response:value.action,note:value.note||null}});
  const updated=await tx.matchProposal.updateMany({where:{id:matchId,status:"INVITED"},data:{status:value.action}});
  if(updated.count!==1)conflict("Opportunity already changed.");
  await audit(tx,account.id,matchId,"FARMER_OPPORTUNITY_"+value.action);
  return {id:matchId,status:value.action};
 });
}
export async function saveQuotation(input:unknown){
 const value=prepareQuotation.parse(input);const {account,db}=await operations();
 if(account.role!=="OPERATIONS")throw new PublicError(403,"Only Operations may prepare commercial quotations.");
 const expiry=new Date(value.validUntil);
 if(expiry.getTime()<=Date.now()+60*60*1000)invalid("Quotation validity must extend at least one hour into the future.");
 if(expiry.getTime()>Date.now()+30*24*60*60*1000)invalid("Validity may not exceed 30 days without approved policy.");
 return atomic(db,async tx=>{
  await ensureAssigned(tx,value.requestId,account.id);
  const requestLines=await tx.buyerRequestLine.findMany({where:{requestId:value.requestId}});
  if(!requestLines.length||requestLines.length!==value.lines.length)conflict("Each buyer request item needs one documented supply candidate.");
  const rows=[];const seen=new Set<string>();const quantitiesBySupply=new Map<string,Prisma.Decimal>();
  let grand=new Prisma.Decimal(0);
  for(const inputLine of value.lines){
   const {match,line,supply,assessment}=await verifiedMatch(tx,inputLine.matchId,value.requestId);
   if(seen.has(line.id))conflict("Multiple quote lines for one buyer request item are not allowed.");
   seen.add(line.id);
   const unitPrice=new Prisma.Decimal(inputLine.unitPriceNgn);
   if(unitPrice.lte(0)||unitPrice.gt("999999999999.99"))invalid("Enter a positive NGN unit price.");
   const lineTotal=match.quantity.mul(unitPrice).toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);
   if(lineTotal.lte(0)||lineTotal.gt("9999999999999999.99"))invalid("Quote line exceeds supported monetary precision.");
   const allocated=(quantitiesBySupply.get(supply.id)||new Prisma.Decimal(0)).add(match.quantity);
   if(allocated.gt(supply.quantity)||allocated.gt(assessment.observedQuantity))conflict("Multiple proposed quote lines exceed observed quantity of the same supply.");
   quantitiesBySupply.set(supply.id,allocated);
   rows.push({requestLineId:line.id,matchId:match.id,description:line.commodityName,quantity:match.quantity,unit:match.unit,unitPriceNgn:unitPrice,totalNgn:lineTotal});
   grand=grand.add(lineTotal);
  }
  if(grand.lte(0)||grand.gt("9999999999999999.99"))invalid("Total quote value exceeds supported precision.");
  let quote=await tx.quotation.findUnique({where:{requestId:value.requestId}});
  let revision;
  if(!quote){
   if(value.expectedVersion!==undefined)conflict("Quotation was not found; refresh the workspace.");
   quote=await tx.quotation.create({data:{requestId:value.requestId,createdById:account.id}});
   revision=await tx.quoteRevision.create({data:{quoteId:quote.id,number:1,createdById:account.id,terms:value.terms,validUntil:expiry,totalNgn:grand,lines:{create:rows}}});
  }else{
   if(value.expectedVersion!==quote.version)conflict("This quotation changed. Reload before editing.");
   if(quote.status==="DRAFT"){
    const changed=await tx.quotation.updateMany({where:{id:quote.id,status:"DRAFT",version:quote.version},data:{version:{increment:1}}});
    if(changed.count!==1)conflict("Quotation changed during draft update.");
    revision=await tx.quoteRevision.findUnique({where:{quoteId_number:{quoteId:quote.id,number:quote.currentRevision}}});
    if(!revision)conflict("Current quote revision not found.");
    await tx.quoteLine.deleteMany({where:{revisionId:revision.id}});
    revision=await tx.quoteRevision.update({where:{id:revision.id},data:{terms:value.terms,validUntil:expiry,totalNgn:grand,lines:{create:rows}}});
   }else if(["REJECTED","DECLINED","EXPIRED"].includes(quote.status)){
    const next=quote.currentRevision+1;
    const changed=await tx.quotation.updateMany({where:{id:quote.id,version:quote.version},data:{status:"DRAFT",version:{increment:1},currentRevision:next,buyerDecidedAt:null}});
    if(changed.count!==1)conflict("Quotation changed during revision.");
    revision=await tx.quoteRevision.create({data:{quoteId:quote.id,number:next,createdById:account.id,terms:value.terms,validUntil:expiry,totalNgn:grand,lines:{create:rows}}});
   }else conflict("This quotation cannot be edited in its current approval or buyer-decision state.");
  }
  await tx.quoteApprovalEvent.create({data:{revisionId:revision.id,actorId:account.id,kind:"DRAFT_SAVED"}});
  await audit(tx,account.id,quote.id,"QUOTE_DRAFT_SAVED",{revision:revision.number});
  return {id:quote.id,status:"DRAFT"};
 });
}
export async function transitionQuote(id:string,input:unknown){
 uid.parse(id);const value=transitionQuotation.parse(input);const {account,db}=await operations();
 return atomic(db,async tx=>{
  const quote=await tx.quotation.findUnique({where:{id},include:{request:true}});
  if(!quote)throw new PublicError(404,"Quotation not found.");
  if(quote.version!==value.expectedVersion)conflict("Quotation changed. Refresh before deciding.");
  const revision=await tx.quoteRevision.findUnique({where:{quoteId_number:{quoteId:id,number:quote.currentRevision}},include:{lines:true}});
  if(!revision||!revision.lines.length)conflict("Quotation has no completed revision.");
  const isAdmin=account.role==="SUPER_ADMIN";
  if(value.action==="approve"||value.action==="reject"){
   if(!isAdmin)throw new PublicError(403,"Only Super Admin may approve or return quotations.");
   if(revision.createdById===account.id)throw new PublicError(403,"The quotation author cannot approve the same revision.");
  }else{
   if(account.role!=="OPERATIONS")throw new PublicError(403,"An assigned Operations reviewer must submit or issue quotations.");
   await ensureAssigned(tx,quote.requestId,account.id);
  }
  const expected={submit:"DRAFT",approve:"PENDING_APPROVAL",reject:"PENDING_APPROVAL",issue:"APPROVED",expire:"ISSUED"} as const;
  if(quote.status!==expected[value.action])conflict("Quotation state does not permit this action.");
  if(value.action==="reject"&&value.note.length<10)invalid("Explain the required changes for the quotation.");
  if(value.action==="expire"&&revision.validUntil.getTime()>Date.now())conflict("The buyer's valid quotation has not expired.");
  if(["submit","approve","issue"].includes(value.action)&&revision.validUntil.getTime()<=Date.now()+5*60*1000)
   conflict("Quotation validity is too short or expired. Prepare a revised draft.");
  if(value.action==="issue"){
   if(quote.request.status!=="SOURCING_IN_PROGRESS")conflict("The sourcing request is not active.");
   for(const line of revision.lines)await verifiedMatch(tx,line.matchId,quote.requestId);
  }
  const to={submit:"PENDING_APPROVAL",approve:"APPROVED",reject:"REJECTED",issue:"ISSUED",expire:"EXPIRED"} as const;
  const kind={submit:"APPROVAL_REQUESTED",approve:"APPROVED",reject:"CHANGES_REQUESTED",issue:"ISSUED",expire:"EXPIRED"} as const;
  const changed=await tx.quotation.updateMany({where:{id,version:quote.version,status:quote.status},data:{status:to[value.action],version:{increment:1}}});
  if(changed.count!==1)conflict("Quotation changed during approval.");
  if(value.action==="issue")await tx.quoteRevision.update({where:{id:revision.id},data:{issuedAt:new Date()}});
  await tx.quoteApprovalEvent.create({data:{revisionId:revision.id,actorId:account.id,kind:kind[value.action],note:value.note||null}});
  await audit(tx,account.id,id,"QUOTE_"+kind[value.action],{revision:revision.number});
  return {id,status:to[value.action]};
 });
}
export async function decideQuote(id:string,input:unknown){
 uid.parse(id);const value=decideQuotation.parse(input);const {account,db}=await requireBuyerApi();
 return atomic(db,async tx=>{
  const member=await tx.buyerMembership.findUnique({where:{accountId:account.id}});
  if(!member||member.role!=="OWNER")throw new PublicError(403,"Only a verified active buyer organization's owner may accept or decline a quotation.");
  const quote=await tx.quotation.findUnique({where:{id},include:{request:true}});
  if(!quote||quote.request.organizationId!==member.organizationId)throw new PublicError(404,"Quotation not found.");
  if(quote.status!=="ISSUED"||quote.version!==value.expectedVersion)conflict("Quotation changed or is no longer open for a decision.");
  if(quote.request.status!=="SOURCING_IN_PROGRESS")conflict("This buyer request is no longer available.");
  const revision=await tx.quoteRevision.findUnique({where:{quoteId_number:{quoteId:id,number:quote.currentRevision}}});
  if(!revision||!revision.issuedAt)conflict("Quotation was not officially issued.");
  if(revision.validUntil.getTime()<=Date.now())conflict("Quotation expired. Request a fresh quotation from SmartHub.");
  const decision=value.decision==="accept"?"ACCEPTED":"DECLINED";
  const changed=await tx.quotation.updateMany({where:{id,status:"ISSUED",version:quote.version},data:{status:decision,version:{increment:1},buyerDecidedAt:new Date()}});
  if(changed.count!==1)conflict("Another buyer action changed the quotation.");
  await tx.quoteApprovalEvent.create({data:{revisionId:revision.id,actorId:account.id,kind:decision,note:value.note||null}});
  await audit(tx,account.id,id,"QUOTE_BUYER_"+decision,{revision:revision.number});
  return {id,status:decision};
 });
}
