import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply,PublicError} from "@/server/auth/http";
import {removeBuyerSpecification} from "@/server/buyer/actions";
import {z} from "zod";
export const runtime="nodejs";
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(req);const {id}=await params;if(!z.uuid().safeParse(id).success)throw new PublicError(404,"Specification not found.");const result=await removeBuyerSpecification(id);return reply({ok:true,...result,next:"/dashboard/settings#saved-specifications"});}catch(e){return errorReply(e);}}
