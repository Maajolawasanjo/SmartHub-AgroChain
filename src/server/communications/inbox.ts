import "server-only";
import {Prisma,type NotificationCategory,type AccountRole} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {getAccountContext} from "@/server/auth/context";
import {getPrisma} from "@/server/db/prisma";
import {z} from "zod";

export type Tx=Prisma.TransactionClient;
export const uuid=z.uuid();
const allowedSegments:Record<AccountRole,string[]>={
 BUYER:["/dashboard/","/support/","/account/"],
 FARMER:["/farmer/","/support/","/account/"],
 FIELD_AGENT:["/field-agent/","/support/","/account/"],
 OPERATIONS:["/operations/","/support/","/account/"],
 SUPER_ADMIN:["/operations/","/admin/","/support/","/account/"]
};
function safePath(role:AccountRole,path:string){
 if(path.length>400||path.includes("?")||path.includes("#")||path.includes("\\")||
  path.startsWith("//")||!path.startsWith("/")||path.split("/").includes("..")||
  !allowedSegments[role].some(prefix=>path.startsWith(prefix)))
  throw new PublicError(400,"Notification link is outside the recipient's authorized workspace.");
}
type Recipient={accountId:string;category:NotificationCategory;title:string;body:string;actionPath:string};
const categoryKey:{[K in Exclude<NotificationCategory,"SECURITY">]: "procurement"|"finance"|"logistics"|"support"}={
 PROCUREMENT:"procurement",FINANCE:"finance",LOGISTICS:"logistics",SUPPORT:"support"
};
export async function publishInboxEvent(tx:Tx,info:{
 eventKey:string;eventType:string;actorId?:string|null;subjectId?:string|null;
 recipients:Recipient[];metadata?:Record<string,string|number|boolean|null>;
}){
 if(info.eventKey.length>180||!info.eventKey||info.eventType.length>80)
  throw new PublicError(400,"Invalid event identity.");
 const event=await tx.outboxEvent.upsert({where:{eventKey:info.eventKey},
  create:{eventKey:info.eventKey,eventType:info.eventType,actorId:info.actorId??null,
   subjectId:info.subjectId??null,metadata:info.metadata??Prisma.DbNull},
  update:{},select:{id:true}});
 const recipients=[...new Map(info.recipients.map(rec=>[rec.accountId,rec])).values()];
 if(!recipients.length)return event.id;
 const users=await tx.account.findMany({where:{id:{in:recipients.map(r=>r.accountId)},status:"ACTIVE"},
  select:{id:true,role:true}});
 const prefs=await tx.notificationPreference.findMany({where:{accountId:{in:users.map(u=>u.id)}}});
 const byPref=new Map(prefs.map(p=>[p.accountId,p]));
 for(const user of users){
  const recipient=recipients.find(r=>r.accountId===user.id)!;
  safePath(user.role,recipient.actionPath);
  const isMandatory=recipient.category==="SECURITY";
  const preference=byPref.get(user.id);
  const accepted=isMandatory||!preference||preference[categoryKey[recipient.category as Exclude<NotificationCategory,"SECURITY">]];
  if(accepted){
   await tx.notification.upsert({where:{eventId_accountId:{eventId:event.id,accountId:user.id}},
    create:{eventId:event.id,accountId:user.id,category:recipient.category,
     title:recipient.title.slice(0,160),body:recipient.body.slice(0,1000),actionPath:recipient.actionPath},
    update:{}});
  }
  await tx.notificationDeliveryAttempt.upsert({where:{eventId_accountId_channel:{eventId:event.id,accountId:user.id,channel:"IN_APP"}},
   create:{eventId:event.id,accountId:user.id,channel:"IN_APP",
    status:accepted?"DELIVERED":"SKIPPED"},update:{}});
 }
 return event.id;
}
export async function requireWorkspaceAccount(){
 const ctx=await getAccountContext();
 if(!ctx||ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at)
  throw new PublicError(401,"Sign in with a verified active account.");
 return {...ctx,db:getPrisma()};
}
export async function accountInbox(actorId:string,limit=40){
 return getPrisma().notification.findMany({where:{accountId:actorId},
  orderBy:{createdAt:"desc"},take:Math.min(80,Math.max(1,limit))});
}
export async function markNotificationRead(id:string,read=true){
 uuid.parse(id);
 const {account,db}=await requireWorkspaceAccount();
 const row=await db.notification.updateMany({where:{id,accountId:account.id},
  data:{readAt:read?new Date():null}});
 if(row.count===0)throw new PublicError(404,"Notification not found.");
 return {id,read};
}
export async function setNotificationsRead(){
 const {account,db}=await requireWorkspaceAccount();
 const count=await db.notification.updateMany({where:{accountId:account.id,readAt:null},
  data:{readAt:new Date()}});
 return {updated:count.count};
}
export async function saveNotificationPreferences(input:unknown){
 const value=z.strictObject({procurement:z.boolean(),finance:z.boolean(),
  logistics:z.boolean(),support:z.boolean()}).parse(input);
 const {account,db}=await requireWorkspaceAccount();
 const row=await db.notificationPreference.upsert({where:{accountId:account.id},
  create:{accountId:account.id,...value},update:value});
 await db.auditEvent.create({data:{actorId:account.id,subjectId:account.id,
  action:"NOTIFICATION_PREFERENCES_UPDATED",details:{inAppOnly:true}}});
 return {procurement:row.procurement,finance:row.finance,logistics:row.logistics,support:row.support};
}
