import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply} from "@/server/auth/http";
import {setNotificationsRead} from "@/server/communications/inbox";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{assertSameOrigin(request);return reply({ok:true,...await setNotificationsRead()});}catch(error){return errorReply(error);}}
