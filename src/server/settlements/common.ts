import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {requireActor} from "@/server/agriculture/policies";
import {getPrisma} from "@/server/db/prisma";
import {hasPermission} from "@/server/admin/permissions";

export type Tx=Prisma.TransactionClient;
const options={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
export function conflict(message:string):never{throw new PublicError(409,message);}
export async function atomic<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>):Promise<T>{
 try{return await db.$transaction(fn,options);}
 catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code))
   conflict("A supplier finance record changed concurrently. Refresh the latest status before retrying.");
  throw error;
 }
}
export async function farmerActor(){
 const ctx=await requireActor("FARMER");
 if(ctx.account.role!=="FARMER")throw new PublicError(403,"A verified farmer account is required.");
 return ctx;
}
export async function operationsActor(){
 const ctx=await requireActor("OPERATIONS");
 if(ctx.account.role!=="OPERATIONS"||!hasPermission(ctx.account.role,"operations.requests.review"))
  throw new PublicError(403,"An assigned Operations reviewer is required.");
 return ctx;
}
export async function superAdminActor(){
 const ctx=await requireActor("OPERATIONS");
 if(ctx.account.role!=="SUPER_ADMIN")throw new PublicError(403,"An independent Super Admin approval is required.");
 return ctx;
}
export async function lockAccount(tx:Tx,id:string,role:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',id);
 const account=await tx.account.findUnique({where:{id},select:{id:true,role:true,status:true}});
 if(!account||account.role!==role||account.status!=="ACTIVE")
  throw new PublicError(403,"The account is inactive or no longer has the required role.");
 return account;
}
export async function lockOrder(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "orders" WHERE "id" = $1::uuid FOR UPDATE',id);
 const order=await tx.order.findUnique({where:{id},include:{
  quotation:{include:{request:{include:{assignment:true}}}},
  paymentObligation:{include:{refunds:true}},
  fulfillmentPlan:{include:{shipments:{include:{issue:true}}}}
 }});
 if(!order)throw new PublicError(404,"Order does not exist.");
 return order;
}
export function orderSafeForSupplierSettlement(order:Awaited<ReturnType<typeof lockOrder>>){
 if(order.status!=="COMPLETED"||order.paymentObligation?.status!=="PAID"||order.fulfillmentPlan?.status!=="COMPLETED")
  conflict("A fully received and cleanly paid buyer order is required for supplier settlement.");
 if(order.fulfillmentPlan.shipments.some(s=>s.issue!==null)||order.paymentObligation.refunds.some(r=>r.status!=="REJECTED"))
  conflict("Unresolved delivery or buyer refund cases prohibit supplier payout.");
}
export async function reviewerScope(tx:Tx,orderId:string,accountId:string){
 const order=await lockOrder(tx,orderId);
 if(order.quotation.request.assignment?.assignedToId!==accountId)
  throw new PublicError(403,"This sourcing case is not assigned to you.");
 return order;
}
export function exactMinor(value:Prisma.Decimal):bigint{
 const minor=value.mul(100);
 if(minor.lte(0)||!minor.isInteger()||minor.gt(Number.MAX_SAFE_INTEGER))
  conflict("Supplier agreement price × buyer-received quantity must resolve to exact, positive NGN kobo without rounding.");
 return BigInt(minor.toFixed(0));
}
export async function audit(tx:Tx,actorId:string,subjectId:string,action:string,details:Record<string,unknown>={}){
 await tx.auditEvent.create({data:{actorId,subjectId,action,details:details as Prisma.InputJsonValue}});
}
