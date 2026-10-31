import type {NextRequest} from "next/server";
import type {Prisma} from "@/generated/prisma/client";
import {requireFieldAgentApi} from "@/server/field-agent/guard";
import {PublicError,errorReply,reply} from "@/server/auth/http";
import {activeStates} from "@/server/field-agent/actions";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  try{
    const {ctx,db}=await requireFieldAgentApi();
    const params=request.nextUrl.searchParams;
    const q=(params.get("q")||"").trim();
    const page=Math.min(Math.max(Number.parseInt(params.get("page")||"1",10)||1,1),500);
    if(q&&q.length<2)throw new PublicError(400,"Enter at least two characters to search assigned farmers or farms.");
    if(q.length>100)throw new PublicError(400,"Search text is too long.");
    const states=await activeStates(ctx.account.id);
    if(states.length===0)return reply({items:[],total:0,page,pageSize:30,activeStates:[]});
    const where:Prisma.FarmWhereInput={state:{in:states},...(q?{OR:[
      {name:{contains:q,mode:"insensitive"}},
      {lga:{contains:q,mode:"insensitive"}},
      {community:{contains:q,mode:"insensitive"}},
      {farmer:{is:{fullName:{contains:q,mode:"insensitive"}}}},
      {farmer:{is:{farmName:{contains:q,mode:"insensitive"}}}},
    ]}:{})};
    const [items,total]=await Promise.all([
      db.farm.findMany({where,orderBy:[{updatedAt:"desc"},{name:"asc"}],skip:(page-1)*30,take:30,select:{id:true,name:true,state:true,lga:true,community:true,updatedAt:true,farmer:{select:{id:true,fullName:true,farmName:true,farmerVerification:{select:{status:true}}}}}}),
      db.farm.count({where}),
    ]);
    return reply({items,total,page,pageSize:30,activeStates:states});
  }catch(error){return errorReply(error);}
}
