import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {openSupportCase} from "@/server/communications/support";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{assertSameOrigin(request);return reply({ok:true,...await openSupportCase(await readJson(request))},201);}catch(error){return errorReply(error);}}
