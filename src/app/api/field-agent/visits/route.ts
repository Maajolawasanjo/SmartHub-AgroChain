import type {NextRequest} from "next/server";
import {z} from "zod";
import {requireFieldAgentApi} from "@/server/field-agent/guard";
import {createFieldVisit,activeStates} from "@/server/field-agent/actions";
import {assertSameOrigin,errorReply,PublicError,readJson,reply} from "@/server/auth/http";
import {fieldVisitCreateInput} from "@/server/field-agent/validators";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const statuses=["DRAFT","IN_PROGRESS","SUBMITTED","REVIEWED","RETURNED","CANCELLED"] as const;
export async function GET(request:NextRequest){
  try{
    const {ctx,db}=await requireFieldAgentApi();
    const params=request.nextUrl.searchParams;
    const rawStatus=params.get("status");
    if(rawStatus&&!statuses.includes(rawStatus as typeof statuses[number]))throw new PublicError(400,"Select a supported field visit status.");
    const status=rawStatus as typeof statuses[number]|null;
    const page=Math.min(Math.max(Number.parseInt(params.get("page")||"1",10)||1,1),500);
    const states=await activeStates(ctx.account.id);
    const where={fieldAgentId:ctx.account.id,farm:{is:{state:{in:states}}},...(status?{status}:{})};
    const [items,total]=await Promise.all([
      db.fieldVisit.findMany({where,orderBy:{updatedAt:"desc"},skip:(page-1)*25,take:25,select:{id:true,purpose:true,status:true,visitDate:true,submittedAt:true,updatedAt:true,farmer:{select:{fullName:true}},farm:{select:{name:true,state:true,lga:true}}}}),
      db.fieldVisit.count({where}),
    ]);
    return reply({items,total,page,pageSize:25,activeStates:states});
  }catch(error){return errorReply(error);}
}
export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request);
    const input=fieldVisitCreateInput.parse(await readJson(request));
    const result=await createFieldVisit(input);
    return reply({ok:true,...result,next:`/field-agent/visits/${result.id}`},201);
  }catch(error){return errorReply(error);}
}
