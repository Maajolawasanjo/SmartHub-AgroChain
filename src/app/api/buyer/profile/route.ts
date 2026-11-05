import type {NextRequest} from "next/server";
import {assertSameOrigin,readJson,reply,errorReply} from "@/server/auth/http";
import {requireBuyerApi,buyerMembership} from "@/server/buyer/guard";
import {saveBuyerProfile} from "@/server/buyer/actions";
import {buyerProfileCompletion} from "@/lib/buyer/profile";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){try{const {account,db}=await requireBuyerApi();const membership=await buyerMembership(db,account.id);return reply({ok:true,profile:membership?.organization??null,role:membership?.role??null,completion:buyerProfileCompletion(membership?.organization)});}catch(e){return errorReply(e);}}
export async function POST(req:NextRequest){try{assertSameOrigin(req);const result=await saveBuyerProfile(await readJson(req));return reply({ok:true,...result,next:"/dashboard/settings"});}catch(e){return errorReply(e);}}
