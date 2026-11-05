import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply} from "@/server/auth/http";
import {inviteFarmer} from "@/server/commerce/service";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;return reply({ok:true,...await inviteFarmer(id)});}catch(e){return errorReply(e);}}
