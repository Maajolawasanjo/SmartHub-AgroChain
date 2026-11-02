import type {NextRequest} from "next/server";
import {submitFieldVisit} from "@/server/field-agent/actions";
import {assertSameOrigin,errorReply,readJson,reply} from "@/server/auth/http";
import {assertFieldRecordId,fieldVisitSubmitInput} from "@/server/field-agent/validators";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const {id:rawId}=await context.params;fieldVisitSubmitInput.parse(await readJson(request));const result=await submitFieldVisit(assertFieldRecordId(rawId));return reply({ok:true,...result});}catch(error){return errorReply(error);}}
