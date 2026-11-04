import "server-only";
import {randomUUID} from "node:crypto";
import {PublicError} from "@/server/auth/http";
import {settle,id} from "./validation";
import {atomic,operationsActor,lockAccount,reviewerScope,orderSafeForSupplierSettlement,conflict,audit} from "./common";
import {createTransferRecipient,decryptNumber,initiateTransfer} from "./paystack-transfers";
import {secretKey} from "@/server/payments/paystack";

export async function initiateSupplierSettlement(obligationId:string,input:unknown){
 id.parse(obligationId);settle.parse(input);
 // Never initiate a real transfer from a partially configured, unapproved or test-only deployment.
 if(process.env.SUPPLIER_PAYOUTS_ENABLED!=="true")
  throw new PublicError(503,"Farmer payouts are disabled until commercial and integration approval.");
 secretKey();
 const {account,db}=await operationsActor();
 const intent=await atomic(db,async tx=>{
  await lockAccount(tx,account.id,"OPERATIONS");
  const pre=await tx.supplierObligation.findUnique({where:{id:obligationId},
   select:{orderLine:{select:{orderId:true}}}});
  if(!pre)throw new PublicError(404,"Payable not found.");
  const order=await reviewerScope(tx,pre.orderLine.orderId,account.id);
  orderSafeForSupplierSettlement(order);
  await tx.$queryRawUnsafe('SELECT "id" FROM "supplier_obligations" WHERE "id" = $1::uuid FOR UPDATE',obligationId);
  const obligation=await tx.supplierObligation.findUnique({where:{id:obligationId},include:{
   agreement:true,orderLine:{include:{lot:{include:{supply:true}},reservation:true}},
   attempts:{orderBy:{createdAt:"desc"},take:1}
  }});
  if(!obligation||obligation.status!=="APPROVED"||!obligation.approvedAt||!obligation.approvedById)
   conflict("Only an independently approved, unreleased payable may be submitted for transfer.");
  if(obligation.approvedById===account.id||obligation.agreement.proposedById!==account.id)
   throw new PublicError(403,"Transfer execution must be by the assigned Operations proposer and must be distinct from the Super Admin approver.");
  if(obligation.attempts.length)conflict("A transfer attempt already exists. Verify its provider status before any re-authorization.");
  if(obligation.orderLine.reservation?.status!=="CONSUMED"||obligation.agreement.status!=="ACCEPTED")
   conflict("Physical supply receipt and supplier consent are no longer valid.");
  const farmer=await tx.account.findUnique({where:{id:obligation.farmerId},
   select:{role:true,status:true,farmerVerification:{select:{status:true}}}});
  if(!farmer||farmer.status!=="ACTIVE"||farmer.role!=="FARMER"||farmer.farmerVerification?.status!=="VERIFIED")
   conflict("The source farmer is no longer verified and eligible for transfer.");
  const bank=await tx.farmerPayoutAccount.findUnique({where:{farmerId:obligation.farmerId}});
  if(!bank||bank.status!=="VERIFIED"||bank.fingerprint!==obligation.bankFingerprint||bank.version!==obligation.bankVersion)
   conflict("The beneficiary changed after approval. Require formal review, not an automatic transfer.");
  const uuid=randomUUID(),reference="stl_"+uuid.replaceAll("-","").toLowerCase();
  const attempt=await tx.supplierSettlementAttempt.create({data:{
   id:uuid,obligationId,initiatedById:account.id,reference,status:"INITIATING"
  }});
  await tx.supplierObligation.update({where:{id:obligationId},data:{status:"TRANSFER_PENDING"}});
  await audit(tx,account.id,attempt.id,"SUPPLIER_TRANSFER_INTENT_RECORDED",{
   orderId:order.id,reference,amountMinor:obligation.amountMinor.toString(),bankLast4:bank.accountLast4,
   authorizedById:obligation.approvedById
  });
  return {attemptId:attempt.id,reference,amountMinor:obligation.amountMinor,
   bankCode:bank.bankCode,accountName:bank.accountName,encryptedNumber:bank.encryptedNumber,
   orderReference:order.reference};
 });
 let recipientCode:string;
 try{
  recipientCode=await createTransferRecipient({
   bankCode:intent.bankCode,accountNumber:decryptNumber(intent.encryptedNumber),accountName:intent.accountName
  });
  await db.supplierSettlementAttempt.updateMany({where:{id:intent.attemptId,status:"INITIATING"},data:{recipientCode}});
  const status=await initiateTransfer({reference:intent.reference,amountMinor:intent.amountMinor,recipientCode,orderReference:intent.orderReference});
  const after=await db.supplierSettlementAttempt.updateMany({where:{id:intent.attemptId,status:"INITIATING"},
   data:{status:status==="otp"?"UNKNOWN":"PENDING"}});
  if(after.count!==1)conflict("The transfer was submitted but its ledger changed. Verify the provider reference.");
  return {id:intent.attemptId,reference:intent.reference,status:status==="otp"?"UNKNOWN":"PENDING"};
 }catch(error){
  // The provider may have accepted a transfer even when the HTTP response was lost.
  // Do not retry the transfer automatically. Provider verification must resolve it first.
  await db.supplierSettlementAttempt.updateMany({where:{id:intent.attemptId,status:"INITIATING"},
   data:{status:"UNKNOWN"}}).catch(()=>undefined);
  if(error instanceof PublicError)throw error;
  throw new PublicError(503,"The provider response is uncertain. Do not resend; reconcile the recorded transfer reference.");
 }
}
