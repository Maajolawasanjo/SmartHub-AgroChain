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
  if (!origin || !host || new URL(origin).host!==host || !['https:','http:'].includes(new URL(origin).protocol))
    throw new PublicError(403,"Invalid request origin.");
}
