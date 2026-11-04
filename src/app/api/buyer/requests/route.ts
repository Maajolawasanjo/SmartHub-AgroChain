import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {createRequest} from "@/server/requests/service";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{assertSameOrigin(req);return reply({ok:true,...await createRequest(await readJson(req,24000))},201);}catch(e){return errorReply(e);}}
