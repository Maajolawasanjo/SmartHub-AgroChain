import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {PublicError} from "@/server/auth/http";

// Credentials are always server-only, never NEXT_PUBLIC_*.
export function secretKey(){
 const key=process.env.PAYSTACK_SECRET_KEY;
 if(!key||!/^sk_(?:test|live)_[A-Za-z0-9]+$/.test(key))
  throw new PublicError(503,"Secure payment services are not configured.");
 return key;
}
export function checkoutCallback(){
 const base=process.env.APP_BASE_URL;
 if(!base)throw new PublicError(503,"Payment callback domain is not configured.");
 let url:URL;
 try{url=new URL(base);}catch{throw new PublicError(503,"Payment callback domain is invalid.");}
 if(url.username||url.password||url.search||url.hash||url.pathname!=="/"||(url.protocol!=="https:"&&!(process.env.NODE_ENV!=="production"&&url.hostname==="localhost")))
  throw new PublicError(503,"Payment callback origin must be an approved HTTPS origin.");
 return new URL("/dashboard/payments/return",url).toString();
}
function validHex(expected:Buffer,received:string){
 if(!/^[0-9a-f]{128}$/.test(received))return false;
 const incoming=Buffer.from(received,"hex");
 return incoming.length===expected.length&&timingSafeEqual(incoming,expected);
}
/** Current Paystack-Signature signing-secret scheme; fail closed rather than downgrade on an invalid v1 header. */
export function verifyWebhookSignature(raw:Buffer,headers:Headers,nowSeconds=Math.floor(Date.now()/1000)):"v1"|"legacy"|null{
 const modern=headers.get("paystack-signature");
 if(modern!==null){
  const secret=process.env.PAYSTACK_WEBHOOK_SECRET;
  if(!secret||!secret.startsWith("whsec_"))return null;
  const fields=modern.split(",").map(v=>v.trim());
  const times=fields.filter(v=>v.startsWith("t=")).map(v=>v.slice(2));
  if(times.length!==1||!/^\d{10,12}$/.test(times[0]))return null;
  const timestamp=Number(times[0]);
  if(!Number.isSafeInteger(timestamp)||Math.abs(nowSeconds-timestamp)>300)return null;
  const expected=createHmac("sha512",secret).update(String(timestamp)).update(".").update(raw).digest();
  for(const field of fields){
   const match=/^v1=(whk_[A-Za-z0-9_-]+):([0-9a-f]{128})$/.exec(field);
   if(match&&validHex(expected,match[2]))return "v1";
  }
  return null;
 }
 // Legacy header only while Paystack still delivers this scheme.
 const legacy=headers.get("x-paystack-signature");
 const key=process.env.PAYSTACK_SECRET_KEY;
 if(!legacy||!key)return null;
 const expected=createHmac("sha512",key).update(raw).digest();
 return validHex(expected,legacy)?"legacy":null;
}
export function hashPayload(raw:Buffer){return createHash("sha256").update(raw).digest("hex");}
const initialized=z.object({
 status:z.literal(true),
 data:z.object({authorization_url:z.string().url(),access_code:z.string().min(1),reference:z.string()})
});
const verified=z.object({
 status:z.literal(true),
 data:z.object({
  reference:z.string(),status:z.string(),amount:z.union([z.number(),z.string()]),currency:z.string(),
  customer:z.object({email:z.string().email()}),
  domain:z.string().optional(),
  id:z.union([z.number(),z.string()]).nullish()
 })
});
type Verification=z.infer<typeof verified>["data"];
async function request<T>(path:string,method:"GET"|"POST",body:unknown,schema:z.ZodType<T>):Promise<T>{
 const response=await fetch("https://api.paystack.co"+path,{method,
  headers:{Authorization:"Bearer "+secretKey(),...(method==="POST"?{"Content-Type":"application/json"}:{})},
  ...(method==="POST"?{body:JSON.stringify(body)}:{}),
  cache:"no-store",signal:AbortSignal.timeout(method==="GET"?3500:12000)});
 if(!response.ok)throw new PublicError(502,"Payment provider could not confirm the operation.");
 let data:unknown;
 try{data=await response.json();}catch{throw new PublicError(502,"Invalid response from payment provider.");}
 const parsed=schema.safeParse(data);
 if(!parsed.success)throw new PublicError(502,"Payment provider returned an unexpected response.");
 return parsed.data;
}
export async function initializeProvider(input:{email:string;amountMinor:bigint;reference:string;orderId:string;obligationId:string}){
 const result=await request("/transaction/initialize","POST",{
  email:input.email,amount:input.amountMinor.toString(),currency:"NGN",reference:input.reference,
  callback_url:checkoutCallback(),
  metadata:JSON.stringify({order_id:input.orderId,obligation_id:input.obligationId})
 },initialized);
 if(result.data.reference!==input.reference)throw new PublicError(502,"Payment provider reference mismatch.");
 const url=new URL(result.data.authorization_url);
 if(url.protocol!=="https:"||url.hostname!=="checkout.paystack.com"||url.username||url.password)
  throw new PublicError(502,"Unapproved provider checkout URL.");
 return result.data.authorization_url;
}
export async function verifyProvider(reference:string):Promise<Verification>{
 if(!/^SMH-[0-9A-F]{32}$/.test(reference))throw new PublicError(400,"Invalid payment reference.");
 return request("/transaction/verify/"+encodeURIComponent(reference),"GET",undefined,verified).then(x=>x.data);
}
export function paidAmountMinor(data:Verification):bigint|null{
 const value=data.amount;
 if(typeof value==="number"&&(!Number.isSafeInteger(value)||value<=0))return null;
 if(typeof value==="string"&&!/^[1-9]\d{0,16}$/.test(value))return null;
 try{const amount=BigInt(value);return amount>BigInt(0)&&amount<=BigInt(Number.MAX_SAFE_INTEGER)?amount:null;}
 catch{return null;}
}
export function providerTransactionId(data:Verification):string|null{
 if(data.id===null||data.id===undefined)return null;
 if(typeof data.id==="number"&&!Number.isSafeInteger(data.id))return null;
 const value=String(data.id);
 return /^\d{1,20}$/.test(value)?value:null;
}
export function providerDomainValid(data:Verification){
 const expected=secretKey().startsWith("sk_test_")?"test":"live";
 return data.domain===expected;
}
