import {NextResponse,type NextRequest} from "next/server";
import {errorReply} from "@/server/auth/http";
import {shipmentEvidenceSignedUrl} from "@/server/fulfilment/evidence";
export const runtime="nodejs";
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string;evidenceId:string}>}){try{
 const {id,evidenceId}=await params;
 const url=await shipmentEvidenceSignedUrl(id,evidenceId);
 return NextResponse.redirect(url,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(e){return errorReply(e);}
}
