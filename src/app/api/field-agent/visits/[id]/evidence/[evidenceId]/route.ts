import {NextResponse,type NextRequest} from "next/server";
import {requireFieldAgentApi} from "@/server/field-agent/guard";
import {fieldEvidenceRedirect} from "@/server/field-agent/evidence";
import {assertFieldRecordId} from "@/server/field-agent/validators";
import {errorReply,PublicError} from "@/server/auth/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,context:{params:Promise<{id:string;evidenceId:string}>}){
 try{const {ctx}=await requireFieldAgentApi();const {id,evidenceId}=await context.params;const url=await fieldEvidenceRedirect(assertFieldRecordId(id),assertFieldRecordId(evidenceId),ctx.account.id);return NextResponse.redirect(url,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});}
 catch(error){if(error instanceof PublicError)return errorReply(error);return errorReply(error);}
}
