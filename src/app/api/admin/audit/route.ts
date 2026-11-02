import type { NextRequest } from "next/server";
import { assertAdminRecordId, requireAdminApi } from "@/server/admin/guard";
import { errorReply, reply } from "@/server/auth/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  try{
    const {db}=await requireAdminApi("staff.audit.read");
    const params=request.nextUrl.searchParams;
    const rawStaffId=params.get("staffId")||undefined;
    const staffId=rawStaffId?assertAdminRecordId(rawStaffId):undefined;
    const page=Math.min(Math.max(Number.parseInt(params.get("page")??"1",10)||1,1),500);
    const staffActions={OR:[{action:{startsWith:"STAFF_"}},{action:{startsWith:"FIELD_AGENT_"}},{action:{startsWith:"FIELD_VISIT_"}}]};
    const where=staffId?{AND:[staffActions,{OR:[{subjectId:staffId},{actorId:staffId}]}]}:staffActions;
    const [items,total]=await Promise.all([
      db.auditEvent.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*30,take:30,
        select:{id:true,action:true,subjectId:true,details:true,createdAt:true,actor:{select:{id:true,fullName:true,role:true}}}}),
      db.auditEvent.count({where}),
    ]);
    return reply({items,total,page,pageSize:30});
  }catch(error){return errorReply(error);}
}
