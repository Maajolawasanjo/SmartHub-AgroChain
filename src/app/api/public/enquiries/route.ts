import {NextResponse,type NextRequest} from "next/server";
import {createHmac} from "node:crypto";
import {z} from "zod";
import {getPrisma} from "@/server/db/prisma";
import {assertSameOrigin,readJson,errorReply,PublicError} from "@/server/auth/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.object({
 fullName:z.string().trim().min(2).max(160),
 email:z.email().trim().toLowerCase().max(254),
 phone:z.string().trim().max(24).optional().default(""),
 organisation:z.string().trim().max(180).optional().default(""),
 audience:z.enum(["farmer","buyer","agribusiness","logistics","partner","investor","other"]),
 subject:z.string().trim().min(3).max(180),
 message:z.string().trim().min(20).max(4000),
 productSlug:z.string().trim().max(110).optional().default(""),
 website:z.string().max(0).optional().default(""),
 "cf-turnstile-response":z.string().min(10).max(3000),
});

export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);
  if(process.env.PUBLIC_CONTACT_ENABLED!=="true"||!process.env.DATABASE_URL||!process.env.CONTACT_HASH_SECRET||process.env.CONTACT_HASH_SECRET.length<32||!process.env.TURNSTILE_SECRET_KEY)
   throw new PublicError(503,"Online enquiries are not yet enabled. Please use the SmartHub email address.");
  const values=schema.parse(await readJson(request));
  // Honeypot and signed, server-verified Turnstile challenge are required before persistence.
  if(values.website)throw new PublicError(400,"Could not accept this submission.");
  if(values.productSlug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.productSlug))throw new PublicError(400,"Invalid product reference.");
  const verification=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:values["cf-turnstile-response"]}),
   signal:AbortSignal.timeout(6500),cache:"no-store"
  });
  if(!verification.ok)throw new PublicError(503,"Verification service unavailable. Try again later.");
  const result=await verification.json() as {success?:boolean};
  if(!result.success)throw new PublicError(400,"Please complete the security check and try again.");
  const senderHash=createHmac("sha256",process.env.CONTACT_HASH_SECRET).update(values.email).digest("hex");
  const db=getPrisma();const now=new Date();
  await db.$transaction(async tx=>{
   const current=await tx.publicContactThrottle.findUnique({where:{senderHash}});
   const windowStart=current&&now.getTime()-current.windowStart.getTime()<3600000?current.windowStart:now;
   const next=current&&windowStart===current.windowStart?current.count+1:1;
   if(next>3)throw new PublicError(429,"Too many enquiries. Please try again later or use email.");
   await tx.publicContactThrottle.upsert({where:{senderHash},create:{senderHash,windowStart,count:1},update:{windowStart,count:next}});
   await tx.publicEnquiry.create({data:{fullName:values.fullName,email:values.email,phone:values.phone||null,
    organisation:values.organisation||null,audience:values.audience,subject:values.subject,message:values.message,
    productSlug:values.productSlug||null,senderHash}});
  });
  return NextResponse.json({ok:true,message:"Your enquiry has been recorded."},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(err){return errorReply(err);}
}
