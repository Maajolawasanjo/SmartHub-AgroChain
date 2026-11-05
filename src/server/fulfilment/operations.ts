import "server-only";
import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {createPlan,createShipment,id,milestone} from "./validation";
import {publishInboxEvent} from "@/server/communications/inbox";
import {atomic,operationActor,lockAccount,operationsScope,lockOrder,requirePaid,conflict,audit,shipmentRecord} from "./common";

export async function prepareFulfillment(input:unknown){
 const value=createPlan.parse(input);const {account,db}=await operationActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["OPERATIONS","SUPER_ADMIN"]);
  const order=await operationsScope(tx,value.orderId,account);
  requirePaid(order);
  const existing=await tx.fulfillmentPlan.findUnique({where:{orderId:order.id}});
  if(existing)return {id:existing.id,status:existing.status,existing:true};
  const request=order.quotation.request;
  if(request.fulfilmentMethod===null)conflict("A buyer-confirmed pickup/delivery method is required.");
  if(request.fulfilmentMethod==="SMARTHUB_DELIVERY"||request.fulfilmentMethod==="THIRD_PARTY"){
   if(!request.deliveryAddress||!request.deliveryCity||!request.deliveryState)
    conflict("The buyer must confirm a complete delivery destination before dispatch planning.");
   if(value.destinationAddress!==request.deliveryAddress||value.destinationCity!==request.deliveryCity||value.destinationState!==request.deliveryState)
    conflict("Operations may not silently change the buyer-confirmed destination.");
  }
  const plan=await tx.fulfillmentPlan.create({data:{orderId:order.id,createdById:account.id,
   destinationState:value.destinationState,destinationCity:value.destinationCity,destinationAddress:value.destinationAddress,
   method:request.fulfilmentMethod,handlingNote:value.handlingNote||null}});
  await audit(tx,account.id,plan.id,"FULFILMENT_PLAN_CREATED",{orderId:order.id,destinationCity:plan.destinationCity,method:plan.method});
  return {id:plan.id,status:plan.status,existing:false};
 });
}

export async function scheduleShipment(input:unknown){
 const value=createShipment.parse(input);const {account,db}=await operationActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["OPERATIONS","SUPER_ADMIN"]);
  const initial=await tx.fulfillmentPlan.findUnique({where:{id:value.planId},select:{orderId:true}});
  if(!initial)throw new PublicError(404,"Fulfilment plan not found.");
  const order=await operationsScope(tx,initial.orderId,account);
  requirePaid(order);
  await tx.$queryRawUnsafe('SELECT "id" FROM "fulfillment_plans" WHERE "id" = $1::uuid FOR UPDATE',value.planId);
  const plan=await tx.fulfillmentPlan.findUnique({where:{id:value.planId}});
  if(!plan||plan.orderId!==order.id||plan.status!=="ACTIVE")
   conflict("Shipment planning is blocked while the fulfilment plan is disputed or completed.");
  const records=await tx.shipmentLine.findMany({where:{shipment:{planId:plan.id,status:{not:"CANCELLED"}}},select:{orderLineId:true,quantity:true}});
  const totals=new Map<string,Prisma.Decimal>();
  for(const line of records)totals.set(line.orderLineId,(totals.get(line.orderLineId)??new Prisma.Decimal(0)).plus(line.quantity));
  const seen=new Set<string>();const createLines:{orderLineId:string;quantity:Prisma.Decimal}[]=[];
  for(const v of value.lines){
   if(seen.has(v.orderLineId))conflict("Each order line can appear only once in a shipment.");
   seen.add(v.orderLineId);
   const original=order.lines.find(l=>l.id===v.orderLineId);
   if(!original)throw new PublicError(404,"Order line does not belong to this fulfilment plan.");
   const qty=new Prisma.Decimal(v.quantity);
   if(qty.lte(0)||qty.gt(original.quantity))
    conflict("A shipment cannot exceed the original purchased order quantity.");
   const allocated=(totals.get(v.orderLineId)??new Prisma.Decimal(0)).plus(qty);
   if(allocated.gt(original.quantity))
    conflict("Total quantities across planned, in-transit and received shipments cannot exceed the original order.");
   totals.set(v.orderLineId,allocated);
   createLines.push({orderLineId:original.id,quantity:qty});
  }
  const uuid=randomUUID(),reference="SHP-"+uuid.replaceAll("-","").toUpperCase();
  const shipment=await tx.shipment.create({data:{id:uuid,planId:plan.id,reference,
   carrierName:value.carrierName,carrierContact:value.carrierContact||null,vehicleNote:value.vehicleNote||null,
   trackingReference:value.trackingReference||null,lines:{create:createLines}}});
  await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:"SHIPMENT_PLANNED",note:"Recorded carrier and quantities; no physical pickup or delivery claimed."}});
  if(order.status==="PAYMENT_VERIFIED"){
   const changed=await tx.order.updateMany({where:{id:order.id,status:"PAYMENT_VERIFIED",version:order.version},data:{status:"FULFILLING",version:{increment:1}}});
   if(changed.count!==1)conflict("The payment status changed before fulfilment planning could be recorded.");
   await tx.orderStatusEvent.create({data:{orderId:order.id,actorId:account.id,status:"FULFILLING",note:"First verified-payment shipment plan created; dispatch and receipt not yet confirmed."}});
  }
  await audit(tx,account.id,shipment.id,"SHIPMENT_PLANNED",{orderId:order.id,reference,lines:createLines.map(l=>({id:l.orderLineId,quantity:l.quantity.toString()}))});
  return {id:shipment.id,reference,status:shipment.status};
 });
}

export async function recordDeliveryMilestone(shipmentId:string,input:unknown){
 id.parse(shipmentId);const value=milestone.parse(input);
 const {account,db}=await operationActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,["OPERATIONS","SUPER_ADMIN"]);
  const {order,shipment}=await shipmentRecord(tx,shipmentId);
  if(account.role!=="SUPER_ADMIN"&&order.quotation.request.assignment?.assignedToId!==account.id)
   throw new PublicError(403,"This shipment is outside your assigned sourcing case.");
  requirePaid(order);
  if(shipment.plan.status!=="ACTIVE")conflict("A contested or completed plan cannot advance transport milestones.");
  const expected={pickup:"PLANNED",dispatch:"PICKED_UP",deliver:"IN_TRANSIT",cancel:"PLANNED"} as const;
  if(shipment.status!==expected[value.action])conflict("Shipment milestone has already advanced or requires a different prior state.");
  let evidenceId:string|null=null;
  if(value.action!=="cancel"){
   if(!value.evidenceId)throw new PublicError(400,"Verified photographic or documentary evidence is required for this milestone.");
   const evidence=shipment.evidence.find(e=>e.id===value.evidenceId&&e.status==="READY");
   if(!evidence)throw new PublicError(404,"Ready evidence must belong to this shipment.");
   const used=await tx.deliveryEvent.findUnique({where:{evidenceId:evidence.id},select:{id:true}});
   if(used)conflict("An evidence file is already attached to another delivery milestone.");
   evidenceId=evidence.id;
  }
  const next={pickup:"PICKED_UP",dispatch:"IN_TRANSIT",deliver:"DELIVERED",cancel:"CANCELLED"} as const;
  const kind={pickup:"PICKUP_CONFIRMED",dispatch:"DISPATCH_CONFIRMED",deliver:"DELIVERY_REPORTED",cancel:"SHIPMENT_CANCELLED"} as const;
  const changed=await tx.shipment.updateMany({where:{id:shipment.id,status:shipment.status},data:{
   status:next[value.action],...(value.action==="pickup"?{pickupAt:new Date()}:{}),
   ...(value.action==="dispatch"?{dispatchAt:new Date()}:{}),
   ...(value.action==="deliver"?{deliveredAt:new Date()}:{})
  }});
  if(changed.count!==1)conflict("Shipment changed during transport milestone.");
  const recorded=await tx.deliveryEvent.create({data:{shipmentId:shipment.id,actorId:account.id,kind:kind[value.action],evidenceId,note:value.note}});
  if(value.action==="deliver"){
   const owners=await tx.buyerMembership.findMany({where:{organizationId:order.organizationId,role:"OWNER"},select:{accountId:true}});
   await publishInboxEvent(tx,{eventKey:"shipment:delivered:"+recorded.id,eventType:"SHIPMENT_DELIVERY_REPORTED",actorId:account.id,subjectId:shipment.id,
    recipients:owners.map(m=>({accountId:m.accountId,category:"LOGISTICS",title:"Delivery arrival reported",
     body:"Shipment "+shipment.reference+" has an Operations-reported arrival. Please confirm quantities physically received.",actionPath:"/dashboard/shipments/"+shipment.id}))});
  }
  await audit(tx,account.id,shipment.id,"SHIPMENT_"+kind[value.action],{orderId:order.id,evidenceId});
  return {id:shipment.id,status:next[value.action]};
 });
}
