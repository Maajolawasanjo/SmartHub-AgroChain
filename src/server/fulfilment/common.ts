import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {getPrisma} from "@/server/db/prisma";
import {requireActor} from "@/server/agriculture/policies";
import {requireBuyerApi,buyerMembership} from "@/server/buyer/guard";
import {hasPermission} from "@/server/admin/permissions";

export type Tx=Prisma.TransactionClient;
const options={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
export function conflict(message:string):never{throw new PublicError(409,message);}
export async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>){
 try{return await db.$transaction(fn,options);}
 catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code))
   conflict("The shipment, receipt or inventory was updated by another action. Refresh and retry.");
  throw error;
 }
}
export async function operationActor(){
 const ctx=await requireActor("OPERATIONS");
 if(!hasPermission(ctx.account.role,"operations.requests.review"))
  throw new PublicError(403,"Operations sourcing authorization required.");
 return ctx;
}
export async function buyerActor(){
 const ctx=await requireBuyerApi();
 const member=await buyerMembership(ctx.db,ctx.account.id);
 if(!member||member.role!=="OWNER")
  throw new PublicError(403,"Only the verified buyer organization's owner may attest delivery or report a discrepancy.");
 return {...ctx,member};
}
export async function lockAccount(tx:Tx,id:string,roles:string[]){
 await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',id);
 const account=await tx.account.findUnique({where:{id},select:{id:true,status:true,role:true}});
 if(!account||account.status!=="ACTIVE"||!roles.includes(account.role))
  throw new PublicError(403,"Your account no longer has the permissions needed for this action.");
}
export async function lockOrder(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "orders" WHERE "id" = $1::uuid FOR UPDATE',id);
 const order=await tx.order.findUnique({where:{id},include:{
  paymentObligation:{select:{status:true}},
  quotation:{include:{request:{include:{assignment:true}}}},
  lines:{include:{reservation:true}}
 }});
 if(!order)throw new PublicError(404,"Order was not found.");
 return order;
}
export async function operationsScope(tx:Tx,id:string,actor:{id:string;role:string}){
 const order=await lockOrder(tx,id);
 if(actor.role!=="SUPER_ADMIN"&&order.quotation.request.assignment?.assignedToId!==actor.id)
  throw new PublicError(403,"The shipment belongs to a different Operations assignment.");
 return order;
}
export function requirePaid(order:Awaited<ReturnType<typeof lockOrder>>){
 if(!["PAYMENT_VERIFIED","FULFILLING"].includes(order.status)||order.paymentObligation?.status!=="PAID")
  conflict("A clean verified payment and no financial review are required before fulfilment.");
 if(order.lines.some(l=>l.reservation?.status!=="ACTIVE"&&l.reservation?.status!=="CONSUMED"))
  conflict("The order has missing or released physical reservations.");
}
export async function shipmentRecord(tx:Tx,shipmentId:string){
 const pre=await tx.shipment.findUnique({where:{id:shipmentId},select:{plan:{select:{orderId:true}}}});
 if(!pre)throw new PublicError(404,"Shipment not found.");
 const order=await lockOrder(tx,pre.plan.orderId);
 await tx.$queryRawUnsafe('SELECT "id" FROM "shipments" WHERE "id" = $1::uuid FOR UPDATE',shipmentId);
 const shipment=await tx.shipment.findUnique({where:{id:shipmentId},include:{lines:{include:{orderLine:{include:{reservation:true}}}},plan:true,evidence:true,issue:true,receipt:{include:{lines:true}}}});
 if(!shipment||shipment.plan.orderId!==order.id)conflict("Shipment and order ownership changed.");
 return {order,shipment};
}
export async function audit(tx:Tx,actorId:string,subjectId:string,action:string,details:Record<string,unknown>={}){
 await tx.auditEvent.create({data:{actorId,subjectId,action,details:details as Prisma.InputJsonValue}});
}
