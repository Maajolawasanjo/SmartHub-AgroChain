import "server-only";
import {createCipheriv,createDecipheriv,createHmac,randomBytes} from "node:crypto";
import {z} from "zod";
import {PublicError} from "@/server/auth/http";
import {secretKey} from "@/server/payments/paystack";

function secret():Buffer{
 const encoded=process.env.FARMER_BANK_ENCRYPTION_KEY;
 if(!encoded)throw new PublicError(503,"Private farmer bank encryption has not been configured.");
 const key=Buffer.from(encoded,"base64");
 if(key.length!==32)throw new PublicError(503,"The farmer bank encryption key is invalid.");
 return key;
}
export function encryptNumber(number:string){
 const key=secret(),iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
 const ciphertext=Buffer.concat([cipher.update(number,"utf8"),cipher.final()]);
 return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),ciphertext.toString("base64url")].join(".");
}
export function decryptNumber(encrypted:string){
 const [iv,tag,ciphertext]=encrypted.split(".");
 if(!iv||!tag||!ciphertext)throw new PublicError(503,"Encrypted payout account record is corrupted.");
 const decipher=createDecipheriv("aes-256-gcm",secret(),Buffer.from(iv,"base64url"));
 decipher.setAuthTag(Buffer.from(tag,"base64url"));
 return Buffer.concat([decipher.update(Buffer.from(ciphertext,"base64url")),decipher.final()]).toString("utf8");
}
export function fingerprint(bankCode:string,number:string){
 return createHmac("sha256",secret()).update(bankCode+"|"+number).digest("hex");
}
function nameTokens(value:string){
 return value.toLowerCase().replace(/[^a-z\s]/g," ").split(/\s+/).filter(Boolean).sort();
}
export function beneficiaryMatchesFarmer(bankName:string,farmerName:string){
 const a=nameTokens(bankName),b=nameTokens(farmerName);
 return a.length>=2&&a.length===b.length&&a.every((v,i)=>v===b[i]);
}
async function paystack<T>(path:string,method:"GET"|"POST",body:unknown,schema:z.ZodType<T>):Promise<T>{
 const response=await fetch("https://api.paystack.co"+path,{
  method,headers:{Authorization:"Bearer "+secretKey(),...(method==="POST"?{"Content-Type":"application/json"}:{})},
  ...(method==="POST"?{body:JSON.stringify(body)}:{}),
  cache:"no-store",signal:AbortSignal.timeout(9000)
 });
 if(!response.ok)throw new PublicError(502,"Paystack could not confirm the bank or transfer. Review the status before retrying.");
 const raw:unknown=await response.json().catch(()=>null);
 const parsed=schema.safeParse(raw);
 if(!parsed.success)throw new PublicError(502,"The payout provider returned an invalid response.");
 return parsed.data;
}
const account=z.object({status:z.literal(true),data:z.object({account_number:z.string(),account_name:z.string().min(3)})});
export async function resolveAccount(bankCode:string,accountNumber:string){
 const result=await paystack("/bank/resolve?"+new URLSearchParams({bank_code:bankCode,account_number:accountNumber}).toString(),
  "GET",null,account);
 if(result.data.account_number!==accountNumber)
  throw new PublicError(409,"The provider resolved a different bank account. No changes were saved.");
 return result.data.account_name;
}
const recipient=z.object({status:z.literal(true),data:z.object({recipient_code:z.string().min(7),currency:z.string(),domain:z.string(),
 details:z.object({account_number:z.string(),bank_code:z.string()})})});
export async function createTransferRecipient(input:{bankCode:string;accountNumber:string;accountName:string}){
 const data=(await paystack("/transferrecipient","POST",{type:"nuban",name:input.accountName,
  account_number:input.accountNumber,bank_code:input.bankCode,currency:"NGN"},recipient)).data;
 const expected=secretKey().startsWith("sk_test_")?"test":"live";
 if(data.currency!=="NGN"||data.domain!==expected||data.details.account_number!==input.accountNumber||data.details.bank_code!==input.bankCode)
  throw new PublicError(502,"The provider returned a beneficiary inconsistent with the verified farmer account.");
 return data.recipient_code;
}
const initiated=z.object({status:z.literal(true),data:z.object({reference:z.string(),status:z.string(),id:z.union([z.number(),z.string()]).nullish()})});
export async function initiateTransfer(input:{reference:string;amountMinor:bigint;recipientCode:string;orderReference:string}){
 const data=(await paystack("/transfer","POST",{source:"balance",amount:input.amountMinor.toString(),currency:"NGN",
  recipient:input.recipientCode,reference:input.reference,reason:"SmartHub farmer supply "+input.orderReference},initiated)).data;
 if(data.reference!==input.reference||!["pending","otp","success","queued"].includes(data.status))
  throw new PublicError(502,"Paystack transfer initiation could not be reliably matched. Verify before retrying.");
 return data.status;
}
const verified=z.object({status:z.literal(true),data:z.object({
 reference:z.string(),status:z.string(),currency:z.string(),domain:z.string(),
 amount:z.union([z.string(),z.number()]),id:z.union([z.string(),z.number()]),
 recipient:z.object({recipient_code:z.string(),currency:z.string(),domain:z.string(),details:z.object({
  account_number:z.string(),bank_code:z.string()})})
})});
export async function verifyTransfer(reference:string){
 if(!/^stl_[0-9a-f]{32}$/.test(reference))throw new PublicError(400,"Invalid supplier transfer reference.");
 return (await paystack("/transfer/verify/"+encodeURIComponent(reference),"GET",null,verified)).data;
}
export function transferAmount(value:number|string):bigint|null{
 if(typeof value==="number"&&!Number.isSafeInteger(value))return null;
 if(!/^[0-9]{1,16}$/.test(String(value)))return null;
 const sum=BigInt(value);
 return sum>BigInt(0)&&sum<=BigInt(Number.MAX_SAFE_INTEGER)?sum:null;
}
export function transferId(value:number|string):string|null{
 if(typeof value==="number"&&!Number.isSafeInteger(value))return null;
 const id=String(value);
 return /^\d{1,20}$/.test(id)?id:null;
}
