import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {createMatch} from "@/server/commerce/service";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{assertSameOrigin(req);return reply({ok:true,...await createMatch(await readJson(req))},201);}catch(e){return errorReply(e);}}
