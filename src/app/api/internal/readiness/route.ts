import "server-only";
import {NextResponse,type NextRequest} from "next/server";
import {createHash,timingSafeEqual} from "node:crypto";
import {getPrisma} from "@/server/db/prisma";
import {authConfigReady} from "@/server/auth/env";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(status=404)=>NextResponse.json({ready:false},{status,headers:{"Cache-Control":"no-store"}});
function matchingSecret(actual:string|null,expected:string){
 if(!actual||!actual.startsWith("Bearer ")||expected.length<32)return false;
 const a=createHash("sha256").update(actual.slice(7)).digest();
 const b=createHash("sha256").update(expected).digest();
 return timingSafeEqual(a,b);
}
export async function GET(request:NextRequest){
 // Optional, staging-only protected probe. No public database status or secret presence leaks.
 if(process.env.RELEASE_ACCEPTANCE_ENABLED!=="true"||
    process.env.NODE_ENV!=="production"||
    !matchingSecret(request.headers.get("authorization"),process.env.RELEASE_HEALTH_TOKEN??""))
  return fail();
 if(!authConfigReady())return fail(503);
 try{
  await getPrisma().$queryRawUnsafe("SELECT 1");
  return NextResponse.json({ready:true},{status:200,headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return fail(503);
 }
}
