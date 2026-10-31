import type {NextRequest} from "next/server";
import {requireAdminApi} from "@/server/admin/guard";
import {errorReply,PublicError,reply} from "@/server/auth/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const statuses=["SUBMITTED","REVIEWED","RETURNED"] as const;
export async function GET(request:NextRequest){
 try{
  const {db}=await requireAdminApi("operations.verification.review");
  const params=request.nextUrl.searchParams;const raw=params.get("status");
  if(raw&&!statuses.includes(raw as typeof statuses[number]))throw new PublicError(400,"Select a supported report status.");
  const status=(raw as typeof statuses[number]|null)||"SUBMITTED";
  const page=Math.min(Math.max(Number.parseInt(params.get("page")||"1",10)||1,1),500);const where={status};
  const [items,total]=await Promise.all([
   db.fieldVisit.findMany({where,orderBy:{submittedAt:"asc"},skip:(page-1)*25,take:25,select:{id:true,purpose:true,status:true,visitDate:true,submittedAt:true,fieldAgent:{select:{fullName:true}},farmer:{select:{fullName:true}},farm:{select:{name:true,state:true,lga:true}}}}),
   db.fieldVisit.count({where}),
  ]);
  return reply({items,total,page,pageSize:25,status});
 }catch(error){return errorReply(error);}
}
