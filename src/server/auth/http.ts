import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { authConfigReady } from "@/server/auth/env";

export class PublicError extends Error { constructor(public status:number, message:string){ super(message); } }
export function reply(body:Record<string,unknown>,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});}
export function errorReply(e:unknown) {
  if (e instanceof PublicError) return reply({error:e.message},e.status);
  if (e instanceof ZodError) return reply({error:"Please review the submitted fields."},400);
  // Do not expose provider/database details, account existence or secrets.
  console.error("Authentication request failed",e instanceof Error?e.name:"unknown");
  return reply({error:"We could not complete this request. Please try again later."},503);
}
export function requireConfig(){if(!authConfigReady())throw new PublicError(503,"Account services are not configured yet.");}
export async function readJson(request:NextRequest,maxCharacters=12000) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new PublicError(415,"Expected JSON data.");
  const raw=await request.text();
  if(raw.length>maxCharacters) throw new PublicError(413,"Request too large.");
  try { return JSON.parse(raw) as unknown; } catch { throw new PublicError(400,"Invalid form data."); }
}
export function assertSameOrigin(request:NextRequest){
  const origin=request.headers.get("origin");
  const host=request.headers.get("host");
  const configured=process.env.APP_BASE_URL;
  // A request-supplied Host header alone must never define the trusted origin.
  // In particular, hostile Host+Origin pairs must not authorize mutations.
  if(!origin || !host || !configured)throw new PublicError(403,"Invalid request origin.");
  try{
    const supplied=new URL(origin);
    const canonical=new URL(configured);
    const allowedProtocol=process.env.NODE_ENV==="production"?"https:":canonical.protocol;
    if(supplied.origin!==canonical.origin || supplied.host!==host ||
       supplied.protocol!==allowedProtocol || canonical.protocol!==allowedProtocol ||
       supplied.username || supplied.password || supplied.search || supplied.hash ||
       supplied.pathname!=="/")
      throw new PublicError(403,"Invalid request origin.");
  }catch{
    throw new PublicError(403,"Invalid request origin.");
  }
}
