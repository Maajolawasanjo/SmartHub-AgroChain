import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {orderCreate,orderId,orderRelease} from "./validation";
import {transact,requireOperator,lockActor,inspectionEligibility,lockLot,assignedRequest,audit,conflict} from "./common";

export async function createPendingOrder(input:unknown){
 const value=orderCreate.parse(input);
 const {account,db}=await requireOperator();
 if(account.role!=="OPERATIONS")throw new PublicError(403,"The assigned Operations reviewer must initiate order conversion.");
 const holdExpiry=new Date(value.holdExpiresAt);
 if(holdExpiry.getTime()<=Date.now()+3600000||holdExpiry.getTime()>Date.now()+14*86400000)
  throw new PublicError(400,"Specify an Operations-approved hold deadline between one hour and 14 days.");
 return transact(db,async tx=>{
  await lockActor(tx,account.id);
  const preQuote=await tx.quotation.findUnique({where:{id:value.quotationId},select:{requestId:true}});
  if(!preQuote)throw new PublicError(404,"Quotation not found.");
  const request=await assignedRequest(tx,preQuote.requestId,account.id);
  await tx.$queryRawUnsafe('SELECT "id" FROM "quotations" WHERE "id" = $1::uuid FOR UPDATE',value.quotationId);
  const quote=await tx.quotation.findUnique({where:{id:value.quotationId}});
  if(!quote||quote.requestId!==request.id)conflict("Quotation and sourcing request do not agree.");
  const previous=await tx.order.findUnique({where:{quotationId:quote.id}});
  if(previous){
   if(previous.createdById!==account.id)conflict("An order already exists for this quotation. Review its recorded status.");
   return {id:previous.id,reference:previous.reference,status:previous.status,existing:true};
  }
  if(quote.status!=="ACCEPTED"||quote.version!==value.expectedQuoteVersion||!quote.buyerDecidedAt)
   conflict("A current buyer-accepted quotation is required before creating a pending-payment order.");
  const revision=await tx.quoteRevision.findUnique({where:{quoteId_number:{quoteId:quote.id,number:quote.currentRevision}},
   include:{lines:{include:{match:{include:{supply:true}}}}}});
  if(!revision||!revision.issuedAt||!revision.lines.length)conflict("Issued quotation revision and line items are required.");
  if(revision.validUntil.getTime()<=Date.now())
   conflict("The original quotation has expired. Obtain new buyer-approved commercial terms.");

  const sourceIds=[...new Set(revision.lines.map(l=>l.match.supplyId))].sort();
  const lotBySource=new Map<string,string>();
  for(const supplyId of sourceIds){
   const {inspection,eligible}=await inspectionEligibility(tx,supplyId);
   const lot=await tx.supplyLot.findUnique({where:{supplyId}});
   if(!lot||lot.inspectionId!==inspection.id||lot.unit!==inspection.observedUnit||lot.quantity.gt(eligible)||lot.status!=="AVAILABLE")
    conflict("The source lot has no current verified physical inspection or is on hold.");
   lotBySource.set(supplyId,lot.id);
  }
  const lotIds=[...new Set(lotBySource.values())].sort();
  const lots=new Map<string,Awaited<ReturnType<typeof lockLot>>>();
  for(const id of lotIds)lots.set(id,await lockLot(tx,id));
  const required=new Map<string,Prisma.Decimal>();
  for(const line of revision.lines){
   if(line.match.status!=="INTERESTED"||!line.match.quantity.eq(line.quantity)||line.match.unit!==line.unit)
    conflict("Quotation line does not match a current interested sourcing candidate.");
   if(line.requestLineId!==line.match.requestLineId||line.match.supply.unit!==line.unit)
    conflict("Matching, quotation and physical supply units do not agree.");
   const interest=await tx.opportunityInterest.findUnique({where:{matchId:line.matchId}});
   if(!interest||interest.response!=="INTERESTED"||interest.farmerId!==line.match.supply.farmerId)
    conflict("The source farmer has not confirmed interest in this matching candidate.");
   const lotId=lotBySource.get(line.match.supplyId);
   if(!lotId)conflict("The source lot does not exist.");
   const lot=lots.get(lotId)!;
   if(lot.status!=="AVAILABLE"||lot.unit!==line.unit)conflict("The physical lot is no longer eligible.");
   required.set(lotId,(required.get(lotId)??new Prisma.Decimal(0)).plus(line.quantity));
  }
  for(const [id,quantity] of required){
   const lot=lots.get(id)!;
   const available=lot.quantity.minus(lot.reservedQuantity).minus(lot.consumedQuantity);
   if(available.lt(quantity))conflict("Insufficient unreserved physical quantity. Refresh sourcing; no stock was held.");
  }
  const uuid=randomUUID(),reference="ORD-"+uuid.replaceAll("-","").toUpperCase();
  const order=await tx.order.create({data:{id:uuid,reference,quotationId:quote.id,revisionId:revision.id,
   organizationId:request.organizationId,createdById:account.id,holdExpiresAt:holdExpiry}});
  for(const line of revision.lines){
   const lotId=lotBySource.get(line.match.supplyId)!;
   const item=await tx.orderLine.create({data:{orderId:order.id,quoteLineId:line.id,lotId,description:line.description,
    quantity:line.quantity,unit:line.unit,unitPriceNgn:line.unitPriceNgn,totalNgn:line.totalNgn}});
   const reservation=await tx.reservation.create({data:{orderLineId:item.id,lotId,quantity:line.quantity,expiresAt:holdExpiry}});
   await tx.stockMovement.create({data:{lotId,reservationId:reservation.id,actorId:account.id,kind:"RESERVED",
    quantity:line.quantity,note:"Pending-payment hold only; not payment proof, warehouse dispatch or ownership transfer."}});
  }
  for(const [id,amount] of required)await tx.supplyLot.update({where:{id},data:{reservedQuantity:{increment:amount}}});
  await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:account.id,status:"PENDING_PAYMENT",
   note:"Operations reserved verified physical supply against a buyer-accepted quotation; no payment verified."}});
  await audit(tx,account.id,order.id,"PENDING_ORDER_CREATED",{quoteId:quote.id,revisionId:revision.id,holdExpiresAt:holdExpiry.toISOString()});
  return {id:order.id,reference,status:order.status,existing:false};
 });
}

export async function releasePendingOrder(id:string,input:unknown){
 orderId.parse(id);const value=orderRelease.parse(input);const {account,db}=await requireOperator();
 return transact(db,async tx=>{
  await lockActor(tx,account.id);
  await tx.$queryRawUnsafe('SELECT "id" FROM "orders" WHERE "id" = $1::uuid FOR UPDATE',id);
  const order=await tx.order.findUnique({where:{id},include:{quotation:{include:{request:{include:{assignment:true}}}}}});
  if(!order)throw new PublicError(404,"Pending order not found.");
  if(order.quotation.request.assignment?.assignedToId!==account.id&&account.role!=="SUPER_ADMIN")
   throw new PublicError(403,"Only the assigned reviewer or Super Admin can release a pending order.");
  if(order.status!=="PENDING_PAYMENT"||order.version!==value.expectedVersion)
   conflict("Only an unchanged unpaid pending order can be cancelled or expired.");
  const deadline=order.holdExpiresAt.getTime();
  if(value.action==="expire"&&deadline>Date.now())conflict("This physical reservation is not due to expire.");
  if(value.action==="cancel"&&deadline<=Date.now())conflict("The hold has expired; use Expire to release it.");
  const reservations=await tx.reservation.findMany({where:{orderLine:{orderId:id}},orderBy:{lotId:"asc"}});
  if(!reservations.length||reservations.some(r=>r.status!=="ACTIVE"))
   conflict("The reservation is partially consumed, previously released or inconsistent; it cannot be restored automatically.");
  const lotIds=[...new Set(reservations.map(r=>r.lotId))].sort();
  for(const lotId of lotIds)await lockLot(tx,lotId);
  const amounts=new Map<string,Prisma.Decimal>();
  for(const reservation of reservations){
   amounts.set(reservation.lotId,(amounts.get(reservation.lotId)??new Prisma.Decimal(0)).plus(reservation.quantity));
   const updated=await tx.reservation.updateMany({where:{id:reservation.id,status:"ACTIVE"},
    data:{status:"RELEASED",releasedAt:new Date()}});
   if(updated.count!==1)conflict("The reservation changed during release.");
   await tx.stockMovement.create({data:{lotId:reservation.lotId,reservationId:reservation.id,actorId:account.id,
    kind:"RELEASED",quantity:reservation.quantity,note:value.reason.slice(0,1000)}});
  }
  for(const [lotId,quantity] of amounts){
   const changed=await tx.supplyLot.updateMany({where:{id:lotId,reservedQuantity:{gte:quantity}},
    data:{reservedQuantity:{decrement:quantity}}});
   if(changed.count!==1)conflict("The lot's stock ledger is inconsistent; no release was committed.");
  }
  const status=value.action==="expire"?"EXPIRED":"CANCELLED";
  const updated=await tx.order.updateMany({where:{id,status:"PENDING_PAYMENT",version:value.expectedVersion},
   data:{status,version:{increment:1},cancelledAt:new Date(),cancellationReason:value.reason}});
  if(updated.count!==1)conflict("Order changed during release.");
  await tx.orderStatusEvent.create({data:{orderId:id,actorId:account.id,status,note:value.reason}});
  await audit(tx,account.id,id,"ORDER_"+status,{lots:lotIds,releasedReservations:reservations.length});
  return {id,status,version:order.version+1};
 });
}
