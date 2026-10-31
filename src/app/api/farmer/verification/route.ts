import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply} from "@/server/auth/http";
import {submitFarmerVerification} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{assertSameOrigin(req);const {id}=await submitFarmerVerification();return reply({ok:true,id,next:"/farmer/kyc"});}catch(e){return errorReply(e);}}
