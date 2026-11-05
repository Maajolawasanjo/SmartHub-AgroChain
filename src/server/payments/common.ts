import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {requireBuyerApi,buyerMembership} from "@/server/buyer/guard";
import {requireActor} from "@/server/agriculture/policies";
import {hasPermission} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";

type Tx=Prisma.TransactionClient;
const txOptions={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
export function conflict(message:string):never{throw new PublicError(409,message);}
export async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>):Promise<T>{
 try{return await db.$transaction(fn,txOptions);}
 catch(e){
  if(e instanceof Prisma.PrismaClientKnownRequestError&&["P2002","P2034"].includes(e.code))
   conflict("The payment or order was changed concurrently. Refresh and review the latest status.");
  throw e;
 }
}
export async function lockOrder(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "orders" WHERE "id" = $1::uuid FOR UPDATE',id);
 const order=await tx.order.findUnique({where:{id},include:{revision:{select:{totalNgn:true,currency:true}},lines:{include:{reservation:true}}}});
 if(!order)throw new PublicError(404,"Order not found.");
 return order;
}
export function toMinor(value:Prisma.Decimal){
 const minor=value.mul(100);
 if(minor.lte(0)||!minor.isInteger()||minor.gt(Number.MAX_SAFE_INTEGER))
  conflict("Order amount is outside the supported exact NGN payment range.");
 return BigInt(minor.toFixed(0));
}
export function payable(order:Awaited<ReturnType<typeof lockOrder>>){
 if(order.status!=="PENDING_PAYMENT"||order.holdExpiresAt.getTime()<=Date.now())
  conflict("The order is no longer within its active payment hold.");
 if(order.revision.currency!=="NGN")conflict("Only NGN payment obligations are currently supported.");
 if(!order.lines.length||order.lines.some(l=>l.reservation?.status!=="ACTIVE"||l.reservation.expiresAt.getTime()<=Date.now()))
  conflict("Every order line must still have a valid active physical supply reservation.");
 return toMinor(order.revision.totalNgn);
}
export async function buyerOwner(){
 const ctx=await requireBuyerApi();
 const member=await buyerMembership(ctx.db,ctx.account.id);
 if(!member||member.role!=="OWNER")throw new PublicError(403,"Only the business owner can authorize payment or request a refund.");
 if(!ctx.account.email||!ctx.user.email_confirmed_at)
  throw new PublicError(403,"A verified buyer email is required for payment.");
 return {...ctx,member};
}
export async function financeActor(){
 const ctx=await requireActor("OPERATIONS");
 if(!hasPermission(ctx.account.role,"operations.requests.review"))
  throw new PublicError(403,"Operations payment review access is required.");
 return ctx;
}
export async function ensureFinanceScope(tx:Tx,orderId:string,account:{id:string;role:string}){
 if(account.role==="SUPER_ADMIN")return;
 const order=await tx.order.findUnique({where:{id:orderId},include:{quotation:{include:{request:{include:{assignment:true}}}}}});
 if(!order||order.quotation.request.assignment?.assignedToId!==account.id)
  throw new PublicError(403,"Only the assigned Operations reviewer or Super Admin may reconcile this order.");
}
export async function audit(tx:Tx,actorId:string,subjectId:string,action:string,details:Record<string,unknown>={}){
 await tx.auditEvent.create({data:{actorId,subjectId,action,details:details as Prisma.InputJsonValue}});
}
