import type { NextRequest } from "next/server";
import { assertSameOrigin, readJson, reply, errorReply } from "@/server/auth/http";
import { claimOperationsCase } from "@/server/operations/review";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{kind:string;id:string}>}){
  try {
    assertSameOrigin(req);
    const {kind,id}=await ctx.params;
    const result=await claimOperationsCase(kind,id,await readJson(req));
    return reply({ok:true,...result});
  }catch(error){return errorReply(error);}
}
