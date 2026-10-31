import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName="smarthub_recovery";
function secret(){
 const raw=process.env.AUTH_RECOVERY_SECRET;
 if(!raw || raw.length<32) throw new Error("AUTH_RECOVERY_SECRET must have at least 32 characters");
 return raw;
}
function signature(value:string) {return createHmac("sha256",secret()).update(value).digest("hex");}
export async function setRecoveryTicket(userId:string){
 const expiry=Date.now()+10*60_000;
 const body=`${userId}.${expiry}`;
 (await cookies()).set(cookieName,`${body}.${signature(body)}`,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
}
export async function validateRecoveryTicket(userId:string){
 const token=(await cookies()).get(cookieName)?.value;
 if(!token) return false;
 const fields=token.split(".");
 if(fields.length!==3 || fields[0]!==userId || !/^\d+$/.test(fields[1]) || Number(fields[1])<Date.now())return false;
 const body=`${fields[0]}.${fields[1]}`;
 const actual=Buffer.from(fields[2],"hex");const expected=Buffer.from(signature(body),"hex");
 return actual.length===expected.length && timingSafeEqual(actual,expected);
}
export async function clearRecoveryTicket(){(await cookies()).delete(cookieName);}
