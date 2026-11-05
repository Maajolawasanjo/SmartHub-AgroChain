import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {publishInboxEvent} from "@/server/communications/inbox";
import {receipt,reportIssue,reviewIssue,id} from "./validation";
import {atomic,buyerActor,operationActor,lockAccount,shipmentRecord,requirePaid,conflict,audit} from "./common";

export async function confirmBuyerReceipt(shipmentId:string,input:unknown){
 id.parse(shipmentId);const value=receipt.parse(input);
 const {account,member,db}=await buyerActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["BUYER"]);
  const activeMember=await tx.buyerMembership.findUnique({where:{accountId:account.id}});
  if(!activeMember||activeMember.role!=="OWNER"||activeMember.organizationId!==member.organizationId)
   throw new PublicError(403,"Current buyer organization owner access required.");
  const {order,shipment}=await shipmentRecord(tx,shipmentId);
  if(order.organizationId!==activeMember.organizationId)throw new PublicError(404,"Shipment not found.");
  requirePaid(order);
  if(order.status!=="FULFILLING")conflict("Order is not available for receipt confirmation.");
  if(!["DELIVERED","ISSUE_REPORTED"].includes(shipment.status)||!shipment.deliveredAt)
   conflict("Only an Operations-reported delivery can be attested as received.");
  if(shipment.receipt)conflict("This shipment already has an immutable buyer receipt.");
  if(value.lines.length!==shipment.lines.length)throw new PublicError(400,"Receipt must explicitly account for every shipped commodity line.");
  const acceptedByLine=new Map<string,Prisma.Decimal>();const shortByLine=new Map<string,Prisma.Decimal>();
  const seen=new Set<string>();
  for(const submitted of value.lines){
   if(seen.has(submitted.shipmentLineId))conflict("Duplicate received commodity line.");
   seen.add(submitted.shipmentLineId);
   const line=shipment.lines.find(l=>l.id===submitted.shipmentLineId);
   if(!line)throw new PublicError(404,"A received commodity line is outside this shipment.");
   const accepted=new Prisma.Decimal(submitted.acceptedQuantity);
   if(accepted.lt(0)||accepted.gt(line.quantity))conflict("Received quantity cannot exceed actual shipment quantity.");
   acceptedByLine.set(line.id,accepted);
   shortByLine.set(line.id,line.quantity.minus(accepted));
  }
  const hasShortage=[...shortByLine.values()].some(n=>n.gt(0));
  if(hasShortage&&value.note.trim().length<15)throw new PublicError(400,"Describe the missing or damaged quantity before recording a partial receipt.");
  // Preserve a single, immutable buyer attestation. A partial receipt does not release missing stock.
  const receiptRow=await tx.receiptConfirmation.create({data:{shipmentId:shipment.id,buyerId:account.id,
   status:hasShortage?"PARTIAL":"COMPLETE",note:value.note||null}});
  for(const line of shipment.lines){
   await tx.receiptLine.create({data:{receiptId:receiptRow.id,shipmentLineId:line.id,
    acceptedQuantity:acceptedByLine.get(line.id)!,shortageQuantity:shortByLine.get(line.id)!}});
  }

  // Order lock above serializes buyer acknowledgements and provider payment exception checks.
  // Lock source lots in stable order to avoid oversell and deadlock when one shipment draws on multiple lots.
  const sourceLotIds=[...new Set(shipment.lines.filter(l=>acceptedByLine.get(l.id)!.gt(0)).map(l=>l.orderLine.lotId))].sort();
  for(const lotId of sourceLotIds){
   await tx.$queryRawUnsafe('SELECT "id" FROM "supply_lots" WHERE "id" = $1::uuid FOR UPDATE',lotId);
  }
  const originalIds=[...new Set(shipment.lines.map(l=>l.orderLineId))];
  const consumedAcrossOrder=await tx.receiptLine.findMany({where:{shipmentLine:{orderLineId:{in:originalIds}}},select:{
   acceptedQuantity:true,shipmentLine:{select:{orderLineId:true}}}});
  const consumedByLine=new Map<string,Prisma.Decimal>();
  for(const r of consumedAcrossOrder)
   consumedByLine.set(r.shipmentLine.orderLineId,(consumedByLine.get(r.shipmentLine.orderLineId)??new Prisma.Decimal(0)).plus(r.acceptedQuantity));
  for(const line of shipment.lines){
   const consumed=consumedByLine.get(line.orderLineId)??new Prisma.Decimal(0);
   if(consumed.gt(line.orderLine.quantity))conflict("Cumulative received quantity exceeds reserved order quantity.");
  }
  for(const line of shipment.lines){
   const accepted=acceptedByLine.get(line.id)!;
   if(accepted.lte(0))continue;
   const reservation=line.orderLine.reservation;
   if(!reservation||reservation.status!=="ACTIVE"||reservation.lotId!==line.orderLine.lotId)
    conflict("Only still-reserved physical stock can be consumed by an actual buyer receipt.");
   const lotResult=await tx.supplyLot.updateMany({
    where:{id:reservation.lotId,reservedQuantity:{gte:accepted}},
    data:{reservedQuantity:{decrement:accepted},consumedQuantity:{increment:accepted}}
   });
   if(lotResult.count!==1)conflict("The physical sourced lot cannot support the attested receipt.");
   await tx.stockMovement.create({data:{lotId:reservation.lotId,reservationId:reservation.id,actorId:account.id,
    kind:"CONSUMED",quantity:accepted,note:"Buyer-attested physical receipt; order "+order.reference+", shipment "+shipment.reference}});
   if(consumedByLine.get(line.orderLineId)!.eq(line.orderLine.quantity)){
    const updated=await tx.reservation.updateMany({where:{id:reservation.id,status:"ACTIVE"},
     data:{status:"CONSUMED",consumedAt:new Date()}});
    if(updated.count!==1)conflict("A reservation changed while finalizing buyer receipt.");
   }
  }
  await tx.shipment.update({where:{id:shipment.id},data:{status:hasShortage?"PARTIAL_RECEIPT":"RECEIVED"}});
  await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:"BUYER_RECEIPT",
   note:hasShortage?"Partial receipt with recorded shortage: "+value.note:"Buyer confirms all shipment lines received. "+(value.note||"")}});
  if(hasShortage){
   if(!shipment.issue)await tx.deliveryIssue.create({data:{shipmentId:shipment.id,reportedById:account.id,category:"SHORTAGE",description:value.note}});
   await tx.fulfillmentPlan.update({where:{id:shipment.planId},data:{status:"REVIEW_REQUIRED"}});
   await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:"SHORTAGE_REPORTED",note:value.note}});
  }
  const allReceipts=await tx.receiptLine.findMany({where:{shipmentLine:{orderLine:{orderId:order.id}}},
   select:{acceptedQuantity:true,shipmentLine:{select:{orderLineId:true}}}});
  const allConsumed=new Map<string,Prisma.Decimal>();
  for(const r of allReceipts)allConsumed.set(r.shipmentLine.orderLineId,(allConsumed.get(r.shipmentLine.orderLineId)??new Prisma.Decimal(0)).plus(r.acceptedQuantity));
  const unresolved=await tx.deliveryIssue.count({where:{shipment:{planId:shipment.planId}}});
  const fullyReceived=order.lines.length>0&&order.lines.every(line=>(allConsumed.get(line.id)??new Prisma.Decimal(0)).eq(line.quantity));
  if(!hasShortage&&unresolved===0&&fullyReceived&&shipment.plan.status==="ACTIVE"){
   const changed=await tx.order.updateMany({where:{id:order.id,status:"FULFILLING",version:order.version},
    data:{status:"COMPLETED",version:{increment:1}}});
   if(changed.count!==1)conflict("Order changed during receipt completion.");
   await tx.fulfillmentPlan.update({where:{id:shipment.planId},data:{status:"COMPLETED"}});
   await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:account.id,status:"COMPLETED",
    note:"All ordered quantities independently attested by the buyer and matched to consumed source reservations. No supplier settlement implied."}});
  }
  await audit(tx,account.id,shipment.id,"BUYER_DELIVERY_RECEIPT",{receiptId:receiptRow.id,hasShortage,orderId:order.id});
  return {id:receiptRow.id,status:receiptRow.status,orderCompleted:!hasShortage&&unresolved===0&&fullyReceived&&shipment.plan.status==="ACTIVE"};
 });
}

export async function raiseDeliveryIssue(shipmentId:string,input:unknown){
 id.parse(shipmentId);const value=reportIssue.parse(input);
 const {account,member,db}=await buyerActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["BUYER"]);
  const current=await tx.buyerMembership.findUnique({where:{accountId:account.id}});
  if(!current||current.role!=="OWNER"||current.organizationId!==member.organizationId)
   throw new PublicError(403,"Buyer owner authorization changed.");
  const {order,shipment}=await shipmentRecord(tx,shipmentId);
  if(order.organizationId!==current.organizationId)throw new PublicError(404,"Shipment not found.");
  if(!["DELIVERED","RECEIVED","PARTIAL_RECEIPT","ISSUE_REPORTED"].includes(shipment.status)||!shipment.deliveredAt)
   conflict("A delivery issue can only concern a shipment reported as delivered.");
  if(Date.now()-shipment.deliveredAt.getTime()>7*86400000)
   conflict("The seven-day initial issue window has elapsed. Contact SmartHub support for manual escalation.");
  if(shipment.issue)return {id:shipment.issue.id,status:shipment.issue.status,existing:true};
  const issue=await tx.deliveryIssue.create({data:{shipmentId:shipment.id,reportedById:account.id,
   category:value.category,description:value.description}});
  await tx.fulfillmentPlan.update({where:{id:shipment.planId},data:{status:"REVIEW_REQUIRED"}});
  // A buyer may report damage AFTER a seemingly complete receipt. Keep the
  // source quantities immutable but make both in-flight and completed orders visibly disputed.
  if(["FULFILLING","COMPLETED"].includes(order.status)){
   const updated=await tx.order.updateMany({where:{id:order.id,status:order.status,version:order.version},
    data:{status:"DELIVERY_REVIEW",version:{increment:1}}});
   if(updated.count!==1)conflict("The order changed during delivery dispute reporting.");
   await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:account.id,status:"DELIVERY_REVIEW",
    note:"Buyer reported a post-arrival delivery issue. Investigation required before further fulfilment or payout."}});
  }
  if(shipment.status==="DELIVERED")await tx.shipment.update({where:{id:shipment.id},data:{status:"ISSUE_REPORTED"}});
  await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:"SHORTAGE_REPORTED",note:value.category+": "+value.description}});
  const admins=await tx.account.findMany({where:{role:"SUPER_ADMIN",status:"ACTIVE"},select:{id:true}});
  const assignee=order.quotation.request.assignment?.assignedToId;
  const recipients=[...new Set([...admins.map(a=>a.id),...(assignee?[assignee]:[])])].filter(id=>id!==account.id);
  await publishInboxEvent(tx,{eventKey:"shipment:dispute:"+issue.id,eventType:"BUYER_DELIVERY_DISPUTE",
   actorId:account.id,subjectId:shipment.id,recipients:recipients.map(accountId=>({
    accountId,category:"LOGISTICS",title:"Buyer delivery dispute requires review",
    body:"Shipment "+shipment.reference+" has a buyer-reported delivery issue. Check any prior supplier payout separately.",
    actionPath:"/operations/disputes"
   }))});
  await audit(tx,account.id,shipment.id,"BUYER_DELIVERY_ISSUE_RAISED",{issueId:issue.id,category:value.category,previousOrderStatus:order.status});
  return {id:issue.id,status:issue.status,existing:false};
 });
}

export async function reviewDeliveryIssue(issueId:string,input:unknown){
 id.parse(issueId);const value=reviewIssue.parse(input);
 const {account,db}=await operationActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["OPERATIONS","SUPER_ADMIN"]);
  const issue=await tx.deliveryIssue.findUnique({where:{id:issueId},select:{shipmentId:true}});
  if(!issue)throw new PublicError(404,"Delivery issue not found.");
  const {order,shipment}=await shipmentRecord(tx,issue.shipmentId);
  if(account.role!=="SUPER_ADMIN"&&order.quotation.request.assignment?.assignedToId!==account.id)
   throw new PublicError(403,"Issue is outside your assigned sourcing scope.");
  const current=await tx.deliveryIssue.findUniqueOrThrow({where:{id:issueId}});
  if(current.status==="RESOLUTION_REQUIRED"||current.status===value.action)
   conflict("This issue already requires formal resolution or has this same review status.");
  const updated=await tx.deliveryIssue.update({where:{id:issueId},data:{
   status:value.action,reviewedById:account.id,reviewNote:value.note}});
  await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:"ISSUE_REVIEWED",
   note:value.action+": "+value.note}});
  await audit(tx,account.id,issueId,"DELIVERY_ISSUE_REVIEWED",{orderId:order.id,status:updated.status});
  return {id:updated.id,status:updated.status};
 });
}
