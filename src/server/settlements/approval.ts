import "server-only";
import {PublicError} from "@/server/auth/http";
import {approval,id} from "./validation";
import {atomic,superAdminActor,lockAccount,lockOrder,orderSafeForSupplierSettlement,conflict,audit} from "./common";

export async function approveSupplierObligation(obligationId:string,input:unknown){
 id.parse(obligationId);const value=approval.parse(input);
 const {account,db}=await superAdminActor();
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,"SUPER_ADMIN");
  const prior=await tx.supplierObligation.findUnique({where:{id:obligationId},
   select:{orderLine:{select:{orderId:true}}}});
  if(!prior)throw new PublicError(404,"Supplier payable not found.");
  const order=await lockOrder(tx,prior.orderLine.orderId);
  orderSafeForSupplierSettlement(order);
  await tx.$queryRawUnsafe('SELECT "id" FROM "supplier_obligations" WHERE "id" = $1::uuid FOR UPDATE',obligationId);
  const payable=await tx.supplierObligation.findUnique({where:{id:obligationId},
   include:{agreement:true,orderLine:{include:{lot:{include:{supply:true}},reservation:true}}}});
  if(!payable||payable.status!=="PENDING_APPROVAL")
   conflict("Only a new, unchanged payable may receive independent approval.");
  if(payable.agreement.status!=="ACCEPTED"||!payable.agreement.acceptedAt||
     payable.farmerId!==payable.agreement.farmerId||
     payable.orderLine.lot.supply.farmerId!==payable.farmerId||
     payable.orderLine.reservation?.status!=="CONSUMED")
   conflict("The farmer agreement and completed physical receipt are inconsistent.");
  if(payable.agreement.proposedById===account.id)
   throw new PublicError(403,"An agreement proposer cannot approve the same payout.");
  const farmer=await tx.account.findUnique({where:{id:payable.farmerId},
   select:{role:true,status:true,farmerVerification:{select:{status:true}}}});
  if(!farmer||farmer.status!=="ACTIVE"||farmer.role!=="FARMER"||farmer.farmerVerification?.status!=="VERIFIED")
   conflict("The verified farmer account is not active.");
  const bank=await tx.farmerPayoutAccount.findUnique({where:{farmerId:payable.farmerId}});
  if(!bank||bank.status!=="VERIFIED")conflict("The farmer must provide an independently verified bank account before payout approval.");
  const result=await tx.supplierObligation.update({where:{id:payable.id},data:{
   status:"APPROVED",approvedById:account.id,approvedAt:new Date(),
   bankFingerprint:bank.fingerprint,bankVersion:bank.version
  }});
  await audit(tx,account.id,result.id,"SUPPLIER_PAYABLE_APPROVED",{
   orderReference:order.reference,bankLast4:bank.accountLast4,bankCode:bank.bankCode,
   bankVersion:bank.version,amountMinor:payable.amountMinor.toString(),reason:value.reason
  });
  return {id:result.id,status:result.status,amountMinor:result.amountMinor.toString()};
 });
}
