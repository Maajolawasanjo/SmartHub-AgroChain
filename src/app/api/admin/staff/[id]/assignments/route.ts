import type { NextRequest } from "next/server";
import { z } from "zod";
import { NIGERIA_STATES } from "@/lib/nigeria-states";
import { assertAdminRecordId, requireAdminApi } from "@/server/admin/guard";
import { PublicError,assertSameOrigin,errorReply,readJson,reply } from "@/server/auth/http";
import { verifyCurrentPassword } from "@/server/auth/reauth";

export const runtime="nodejs";
const stateSchema=z.enum(NIGERIA_STATES);
const inputSchema=z.object({states:z.array(stateSchema).max(NIGERIA_STATES.length).refine(values=>new Set(values).size===values.length,"Remove duplicate states."),currentPassword:z.string().min(1).max(256)});

export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    const {db}=await requireAdminApi("staff.assign");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);
    const account=await db.account.findUnique({where:{id},select:{role:true}});
    if(!account||account.role!=="FIELD_AGENT")throw new PublicError(404,"Field Agent record not found.");
    const assignments=await db.fieldAgentAssignment.findMany({where:{fieldAgentId:id},orderBy:{state:"asc"},select:{id:true,state:true,active:true,createdAt:true,updatedAt:true}});
    return reply({assignments});
  }catch(error){return errorReply(error);}
}

export async function PUT(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{
    assertSameOrigin(request);
    const {ctx,db}=await requireAdminApi("staff.assign");
    const {id:rawId}=await context.params;
    const id=assertAdminRecordId(rawId);
    const input=inputSchema.parse(await readJson(request));
    await verifyCurrentPassword(ctx.user.email,input.currentPassword,ctx.user.id);
    const changes=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "app_accounts" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const target=await tx.account.findUnique({where:{id},select:{id:true,role:true,status:true}});
      if(!target||target.role!=="FIELD_AGENT")throw new PublicError(404,"Field Agent record not found.");
      if(target.status!=="ACTIVE")throw new PublicError(409,"Reinstate this Field Agent before changing assignments.");
      const desired=new Set(input.states);
      const current=await tx.fieldAgentAssignment.findMany({where:{fieldAgentId:id,active:true},select:{state:true}});
      const active=new Set(current.map(row=>row.state));
      const added=input.states.filter(state=>!active.has(state));
      const removed=[...active].filter(state=>!desired.has(state));
      for(const state of added){
        await tx.fieldAgentAssignment.upsert({where:{fieldAgentId_state:{fieldAgentId:id,state}},
          create:{fieldAgentId:id,state,assignedById:ctx.account.id,active:true},
          update:{assignedById:ctx.account.id,active:true}});
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_AGENT_STATE_ASSIGNED",subjectId:id,details:{state}}});
      }
      for(const state of removed){
        await tx.fieldAgentAssignment.updateMany({where:{fieldAgentId:id,state,active:true},data:{active:false}});
        await tx.auditEvent.create({data:{actorId:ctx.account.id,action:"FIELD_AGENT_STATE_UNASSIGNED",subjectId:id,details:{state}}});
      }
      return {added,removed,activeStates:[...desired].sort()};
    },{timeout:30000,maxWait:10000});
    if(changes.added.length===0&&changes.removed.length===0)return reply({ok:true,message:"Assignments are already up to date."});
    return reply({ok:true,message:"Field Agent state assignments updated.",activeStates:changes.activeStates});
  }catch(error){return errorReply(error);}
}
