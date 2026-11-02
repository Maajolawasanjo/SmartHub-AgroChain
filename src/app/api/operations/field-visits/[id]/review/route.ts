import type {NextRequest} from "next/server";
import {reviewFieldVisit} from "@/server/field-agent/actions";
import {assertSameOrigin,errorReply,readJson,reply} from "@/server/auth/http";
import {assertFieldRecordId} from "@/server/field-agent/validators";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const {id:rawId}=await context.params;const id=assertFieldRecordId(rawId);const result=await reviewFieldVisit(id,await readJson(request));return reply({ok:true,...result});}catch(error){return errorReply(error);}}
