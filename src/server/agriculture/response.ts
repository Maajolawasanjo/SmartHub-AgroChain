import type { NextRequest } from "next/server";
import { assertSameOrigin, readJson, reply, errorReply } from "@/server/auth/http";
export async function agriculturePost(request: NextRequest, action:(input:unknown)=>Promise<{id?:string; status?:string}>,next:string){
  try {
    assertSameOrigin(request);
    const result=await action(await readJson(request));
    return reply({ok:true,...result,next});
  } catch(e) {return errorReply(e);}
}
