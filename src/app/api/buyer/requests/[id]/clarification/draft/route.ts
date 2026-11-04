import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {saveClarificationDraft} from "@/server/requests/service";
export const runtime="nodejs";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await saveClarificationDraft(id,await readJson(req))});}catch(e){return errorReply(e);}}
