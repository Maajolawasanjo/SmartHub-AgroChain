import "server-only";
import {PublicError} from "@/server/auth/http";
import {bankDetails} from "./validation";
import {farmerActor,atomic,lockAccount,conflict,audit} from "./common";
import {resolveAccount,beneficiaryMatchesFarmer,encryptNumber,fingerprint} from "./paystack-transfers";

export async function saveFarmerPayoutAccount(input:unknown){
 const value=bankDetails.parse(input);const {account,db}=await farmerActor();
 // Check that the actual bank service resolves this destination and names the authenticated farmer.
 // Never trust a browser-entered account name or accept unverified ownership.
 const verifiedName=await resolveAccount(value.bankCode,value.accountNumber);
 if(!beneficiaryMatchesFarmer(verifiedName,account.fullName))
  throw new PublicError(409,"The bank's account holder name does not match your verified farmer name. Contact support for identity review.");
 return atomic(db,async tx=>{
  await lockAccount(tx,account.id,"FARMER");
  const farmer=await tx.farmerVerification.findUnique({where:{farmerId:account.id},select:{status:true}});
  if(farmer?.status!=="VERIFIED")throw new PublicError(403,"Only verified farmers may register a payment destination.");
  const pending=await tx.supplierObligation.count({where:{farmerId:account.id,status:{in:["APPROVED","TRANSFER_PENDING","REVIEW_REQUIRED"]}}});
  if(pending>0)conflict("A payout is approved, transferring or under review. The beneficiary cannot be changed without a formal financial hold and reapproval.");
  const tag=fingerprint(value.bankCode,value.accountNumber);
  const previous=await tx.farmerPayoutAccount.findUnique({where:{farmerId:account.id}});
  if(previous?.fingerprint===tag&&previous.status==="VERIFIED")
   return {last4:previous.accountLast4,accountName:previous.accountName,status:previous.status,existing:true};
  const record=previous?await tx.farmerPayoutAccount.update({where:{farmerId:account.id},data:{
    bankCode:value.bankCode,accountName:verifiedName,accountLast4:value.accountNumber.slice(-4),
    encryptedNumber:encryptNumber(value.accountNumber),fingerprint:tag,version:{increment:1},status:"VERIFIED",verifiedAt:new Date()
  }}):await tx.farmerPayoutAccount.create({data:{
    farmerId:account.id,bankCode:value.bankCode,accountName:verifiedName,accountLast4:value.accountNumber.slice(-4),
    encryptedNumber:encryptNumber(value.accountNumber),fingerprint:tag,status:"VERIFIED",verifiedAt:new Date()
  }});
  await audit(tx,account.id,record.id,"FARMER_BANK_ACCOUNT_VERIFIED",{bankCode:record.bankCode,last4:record.accountLast4,version:record.version});
  return {last4:record.accountLast4,accountName:record.accountName,status:record.status,existing:false};
 });
}
