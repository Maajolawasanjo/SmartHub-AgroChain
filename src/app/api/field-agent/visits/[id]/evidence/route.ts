import type {NextRequest} from "next/server";
import {uploadFieldVisitEvidence,removeFieldVisitEvidence} from "@/server/field-agent/evidence";
import {assertSameOrigin,errorReply,PublicError,reply} from "@/server/auth/http";
import {assertFieldRecordId,fieldVisitEvidenceInput} from "@/server/field-agent/validators";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY=10*1024*1024+128*1024;
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const length=Number(request.headers.get("content-length")||0);
    if(length>MAX_BODY)throw new PublicError(413,"Evidence must be no larger than 10 MB.");
    const {id:rawId}=await context.params;const visitId=assertFieldRecordId(rawId);
    const form=await request.formData();const file=form.get("file");
    if(!(file instanceof File))throw new PublicError(400,"Choose an evidence file.");
    const {caption}=fieldVisitEvidenceInput.parse({caption:form.get("caption")||""});
    const result=await uploadFieldVisitEvidence(visitId,file,caption||null);
    return reply({ok:true,item:result},201);
  }catch(error){return errorReply(error);}
}
export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{assertSameOrigin(request);const {id:rawId}=await context.params;const visitId=assertFieldRecordId(rawId);const evidenceId=assertFieldRecordId(request.nextUrl.searchParams.get("evidenceId")||"");const result=await removeFieldVisitEvidence(visitId,evidenceId);return reply({ok:true,...result});}
  catch(error){return errorReply(error);}
}
