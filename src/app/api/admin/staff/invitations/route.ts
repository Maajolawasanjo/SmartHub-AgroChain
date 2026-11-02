import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/server/admin/guard";
import { errorReply, reply } from "@/server/auth/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  try{
    const {db}=await requireAdminApi("staff.invite");
    const params=request.nextUrl.searchParams;
    const page=Math.min(Math.max(Number.parseInt(params.get("page")??"1",10)||1,1),500);
    const status=params.get("status");
    const validStatus=["PENDING","ACCEPTED","REVOKED","EXPIRED","DELIVERY_FAILED","DELIVERY_UNCERTAIN"].includes(status??"")?status:undefined;
    const where=validStatus==="EXPIRED"?{status:"PENDING" as const,expiresAt:{lte:new Date()}}:
      validStatus==="PENDING"?{status:"PENDING" as const,expiresAt:{gt:new Date()}}:
      validStatus?{status:validStatus as "PENDING"|"ACCEPTED"|"REVOKED"|"DELIVERY_FAILED"|"DELIVERY_UNCERTAIN"}:{ };
    const [items,total]=await Promise.all([
      db.staffInvitation.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,
        select:{id:true,email:true,role:true,status:true,expiresAt:true,createdAt:true,acceptedAt:true,invitedUserId:true,invitedBy:{select:{fullName:true}}}}),
      db.staffInvitation.count({where}),
    ]);
    const now=Date.now();
    return reply({items:items.map(item=>({...item,effectiveStatus:item.status==="PENDING"&&item.expiresAt.getTime()<=now?"EXPIRED":item.status})),total,page,pageSize:25});
  }catch(error){return errorReply(error);}
}
