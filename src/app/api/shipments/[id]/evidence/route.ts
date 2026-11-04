import type {NextRequest} from "next/server";
import {assertSameOrigin,reply,errorReply,PublicError} from "@/server/auth/http";
import {uploadShipmentEvidence} from "@/server/fulfilment/evidence";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{
 assertSameOrigin(req);
 const reported=Number(req.headers.get("content-length")??0);
 if(reported>10*1024*1024+128*1024)throw new PublicError(413,"Shipment evidence is limited to 10 MB.");
 const {id}=await params,form=await req.formData(),file=form.get("file");
 if(!(file instanceof File))throw new PublicError(400,"Choose a JPEG, PNG, WebP or PDF.");
 return reply({ok:true,item:await uploadShipmentEvidence(id,file)},201);
 }catch(e){return errorReply(e);}
}
