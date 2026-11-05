import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {saveBuyerDestination} from "@/server/buyer/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{assertSameOrigin(req);const result=await saveBuyerDestination(await readJson(req));return reply({ok:true,...result,next:"/dashboard/settings"});}catch(e){return errorReply(e);}}
