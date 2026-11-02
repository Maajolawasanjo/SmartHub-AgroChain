import {NextResponse,type NextRequest} from "next/server";
import {requireAdminApi} from "@/server/admin/guard";
import {operationsEvidenceRedirect} from "@/server/field-agent/evidence";
import {assertFieldRecordId} from "@/server/field-agent/validators";
import {errorReply} from "@/server/auth/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,context:{params:Promise<{id:string;evidenceId:string}>}){
 try{await requireAdminApi("operations.verification.review");const {id,evidenceId}=await context.params;const url=await operationsEvidenceRedirect(assertFieldRecordId(id),assertFieldRecordId(evidenceId));return NextResponse.redirect(url,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});}
 catch(error){return errorReply(error);}
}
