import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {publishInboxEvent} from "@/server/communications/inbox";
import {id,supplierTerms,farmerDecision} from "./validation";
import {operationsActor,farmerActor,atomic,lockAccount,lockOrder,reviewerScope,orderSafeForSupplierSettlement,exactMinor,conflict,audit} from "./common";

export async function proposeFarmerAgreement(input:unknown){
 const value=supplierTerms.parse(input);const {account,db}=await operationsActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,"OPERATIONS");
  const item=await tx.orderLine.findUnique({where:{id:value.orderLineId},
   include:{lot:{include:{supply:{select:{farmerId:true}}}}}});
  if(!item)throw new PublicError(404,"Order line not found.");
  const order=await reviewerScope(tx,item.orderId,account.id);
  if(["CANCELLED","EXPIRED","PENDING_PAYMENT","PAYMENT_REVIEW"].includes(order.status)||order.paymentObligation?.status!=="PAID")
   conflict("Supplier terms can only be proposed against a clean, provider-verified buyer order.");
  const farmer=await tx.account.findUnique({where:{id:item.lot.supply.farmerId},
   select:{role:true,status:true,farmerVerification:{select:{status:true}}}});
  if(!farmer||farmer.role!=="FARMER"||farmer.status!=="ACTIVE"||farmer.farmerVerification?.status!=="VERIFIED")
   conflict("A current verified farmer is required for the offer.");
  const previous=await tx.supplierAgreement.findUnique({where:{orderLineId:item.id}});
  if(previous&&previous.status!=="DECLINED")
   conflict("An offer is awaiting consent or was already accepted. Amendments require a documented new negotiation.");
  const price=new Prisma.Decimal(value.unitPriceNgn);
  if(price.lte(0))conflict("Supplier price must be positive.");
  const offer=previous?await tx.supplierAgreement.update({where:{id:previous.id},data:{
   unitPriceNgn:price,proposedById:account.id,status:"PROPOSED",version:{increment:1},note:value.note,acceptedAt:null
  }}):await tx.supplierAgreement.create({data:{
   orderLineId:item.id,farmerId:item.lot.supply.farmerId,proposedById:account.id,
   unitPriceNgn:price,currency:"NGN",note:value.note
  }});
  await audit(tx,account.id,offer.id,"SUPPLIER_TERMS_PROPOSED",{
   orderLineId:item.id,unitPriceNgn:price.toString(),quantity:item.quantity.toString(),version:offer.version
  });
  await publishInboxEvent(tx,{eventKey:"farmer-offer:"+offer.id+":v"+offer.version,eventType:"SUPPLIER_TERMS_PROPOSED",
   actorId:account.id,subjectId:offer.id,recipients:[{accountId:offer.farmerId,category:"FINANCE",
    title:"New supplier price offer",body:"SmartHub has proposed independent commercial terms for your sourced supply. Review and accept or decline.",actionPath:"/farmer/settlements"}]});
  return {id:offer.id,status:offer.status,version:offer.version};
 });
}

export async function respondToSupplierAgreement(agreementId:string,input:unknown){
 id.parse(agreementId);const value=farmerDecision.parse(input);const {account,db}=await farmerActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,"FARMER");
  const pre=await tx.supplierAgreement.findUnique({where:{id:agreementId},select:{orderLine:{select:{orderId:true}}}});
  if(!pre)throw new PublicError(404,"Supplier offer not found.");
  const order=await lockOrder(tx,pre.orderLine.orderId);
  if(["CANCELLED","EXPIRED","PAYMENT_REVIEW"].includes(order.status)||order.paymentObligation?.status!=="PAID")
   conflict("Supplier offer cannot be accepted while buyer payment or order is under review.");
  const farmer=await tx.farmerVerification.findUnique({where:{farmerId:account.id},select:{status:true}});
  if(farmer?.status!=="VERIFIED")throw new PublicError(403,"The farmer's verification is no longer active.");
  await tx.$queryRawUnsafe('SELECT "id" FROM "supplier_agreements" WHERE "id" = $1::uuid FOR UPDATE',agreementId);
  const offer=await tx.supplierAgreement.findUnique({where:{id:agreementId},include:{orderLine:{include:{lot:{include:{supply:true}}}}}});
  if(!offer||offer.farmerId!==account.id||offer.orderLine.lot.supply.farmerId!==account.id)
   throw new PublicError(404,"Supplier offer not found.");
  if(offer.status!=="PROPOSED"||offer.version!==value.expectedVersion)
   conflict("The commercial offer was revised or already answered. Refresh before accepting any price.");
  const status=value.action==="accept"?"ACCEPTED":"DECLINED";
  const changed=await tx.supplierAgreement.updateMany({where:{id:offer.id,version:value.expectedVersion,status:"PROPOSED"},
   data:{status,acceptedAt:status==="ACCEPTED"?new Date():null}});
  if(changed.count!==1)conflict("Another decision changed this offer.");
  await audit(tx,account.id,offer.id,"SUPPLIER_TERMS_"+status,{
   orderLineId:offer.orderLineId,priceNgn:offer.unitPriceNgn.toString(),quantity:offer.orderLine.quantity.toString(),version:offer.version
  });
  return {id:offer.id,status};
 });
}

export async function createSupplierObligation(agreementId:string){
 id.parse(agreementId);const {account,db}=await operationsActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,"OPERATIONS");
  const offer=await tx.supplierAgreement.findUnique({where:{id:agreementId},include:{
   orderLine:{include:{lot:{include:{supply:true}},reservation:true}}
  }});
  if(!offer)throw new PublicError(404,"Accepted farmer agreement not found.");
  const order=await reviewerScope(tx,offer.orderLine.orderId,account.id);
  orderSafeForSupplierSettlement(order);
  if(offer.status!=="ACCEPTED"||!offer.acceptedAt)
   conflict("The farmer must accept a separate, immutable unit-price offer before any payable is created.");
  if(offer.farmerId!==offer.orderLine.lot.supply.farmerId||offer.orderLine.reservation?.status!=="CONSUMED")
   conflict("The supplier terms, physical source and fully received reservation do not reconcile.");
  const verified=await tx.account.findUnique({where:{id:offer.farmerId},
   select:{role:true,status:true,farmerVerification:{select:{status:true}}}});
  if(!verified||verified.role!=="FARMER"||verified.status!=="ACTIVE"||verified.farmerVerification?.status!=="VERIFIED")
   conflict("The source farmer is no longer verified.");
  const receipts=await tx.receiptLine.aggregate({where:{shipmentLine:{orderLineId:offer.orderLineId}},
   _sum:{acceptedQuantity:true}});
  const received=receipts._sum.acceptedQuantity??new Prisma.Decimal(0);
  if(!received.eq(offer.orderLine.quantity))conflict("Supplier payable requires exact reconciliation of all buyer-attested physical receipt quantities.");
  const amountMinor=exactMinor(received.mul(offer.unitPriceNgn));
  const previous=await tx.supplierObligation.findUnique({where:{orderLineId:offer.orderLineId}});
  if(previous){
   if(previous.agreementId!==offer.id||previous.amountMinor!==amountMinor||!previous.quantity.eq(received))
    conflict("Existing payable does not match the unchanged farmer consent and receipt.");
   return {id:previous.id,status:previous.status,amountMinor:previous.amountMinor.toString(),existing:true};
  }
  const obligation=await tx.supplierObligation.create({data:{
   orderLineId:offer.orderLineId,agreementId:offer.id,farmerId:offer.farmerId,quantity:received,
   amountMinor,currency:"NGN"
  }});
  await audit(tx,account.id,obligation.id,"SUPPLIER_PAYABLE_CREATED",{
   orderId:order.id,farmerId:offer.farmerId,quantity:received.toString(),
   supplierUnitPriceNgn:offer.unitPriceNgn.toString(),amountMinor:amountMinor.toString()
  });
  return {id:obligation.id,status:obligation.status,amountMinor:amountMinor.toString(),existing:false};
 });
}
