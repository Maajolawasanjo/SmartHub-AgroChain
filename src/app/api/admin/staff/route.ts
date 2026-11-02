import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/server/admin/guard";
import { STAFF_ROLES } from "@/server/admin/permissions";
import { errorReply, reply } from "@/server/auth/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  try{
    const {db}=await requireAdminApi("staff.manage");
    const params=request.nextUrl.searchParams;
    const search=(params.get("q")??"").trim().slice(0,120);
    const role=params.get("role");
    const status=params.get("status");
    const page=Math.min(Math.max(Number.parseInt(params.get("page")??"1",10)||1,1),500);
    const pageSize=25;
    const where={
      role:role&&STAFF_ROLES.includes(role as typeof STAFF_ROLES[number])?role as typeof STAFF_ROLES[number]:{in:[...STAFF_ROLES]},
      ...(status&&["ACTIVE","SUSPENDED","DISABLED"].includes(status)?{status:status as "ACTIVE"|"SUSPENDED"|"DISABLED"}:{}),
      ...(search?{OR:[{fullName:{contains:search,mode:"insensitive" as const}},{email:{contains:search,mode:"insensitive" as const}}]}:{}),
    };
    const [items,total]=await Promise.all([
      db.account.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],skip:(page-1)*pageSize,take:pageSize,
        select:{id:true,fullName:true,email:true,phone:true,role:true,status:true,createdAt:true,updatedAt:true,
          fieldAgentAssignments:{where:{active:true},select:{state:true},orderBy:{state:"asc"}}}}),
      db.account.count({where}),
    ]);
    return reply({items:items.map(item=>({...item,activeStates:item.fieldAgentAssignments.map(a=>a.state),fieldAgentAssignments:undefined})),total,page,pageSize});
  }catch(error){return errorReply(error);}
}
