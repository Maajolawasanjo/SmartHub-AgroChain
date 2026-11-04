import "server-only";
import {Prisma} from "@/generated/prisma/client";
import {PublicError} from "@/server/auth/http";
import {requireActor} from "@/server/agriculture/policies";
import {hasPermission} from "@/server/admin/permissions";
import {getPrisma} from "@/server/db/prisma";

export type Tx=Prisma.TransactionClient;
const cfg={isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000} as const;
export function conflict(message:string):never{throw new PublicError(409,message);}
export async function transact<T>(db:ReturnType<typeof getPrisma>,fn:(tx:Tx)=>Promise<T>):Promise<T>{
 try{return await db.$transaction(fn,cfg);}
 catch(e){
  if(e instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(e.code))
   conflict("A simultaneous inventory action changed this record. Refresh before retrying.");
  throw e;
 }
}
export async function requireOperator(){
 const ctx=await requireActor("OPERATIONS");
 if(!hasPermission(ctx.account.role,"operations.supply.review")||!hasPermission(ctx.account.role,"operations.requests.review"))
  throw new PublicError(403,"Operations inventory and sourcing permissions are required.");
 return ctx;
}
export async function audit(tx:Tx,actorId:string,subjectId:string,action:string,details:Record<string,unknown>={}){
 await tx.auditEvent.create({data:{actorId,subjectId,action,details:details as Prisma.InputJsonValue}});
}
// All SQL statements are constants; $1 is a bound parameter, not string interpolation.
export async function lockActor(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "app_accounts" WHERE "id" = $1::uuid FOR UPDATE',id);
 const account=await tx.account.findUnique({where:{id},select:{role:true,status:true}});
 if(!account||account.status!=="ACTIVE"||!["OPERATIONS","SUPER_ADMIN"].includes(account.role))
  throw new PublicError(403,"Active Operations access is required.");
 return account;
}
export async function lockSupply(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "supply_declarations" WHERE "id" = $1::uuid FOR UPDATE',id);
 const supply=await tx.supplyDeclaration.findUnique({where:{id}});
 if(!supply)throw new PublicError(404,"Physical supply record not found.");
 return supply;
}
export async function inspectionEligibility(tx:Tx,id:string){
 const supply=await lockSupply(tx,id);
 if(supply.status!=="APPROVED")conflict("Only approved physical supply may be registered or reserved.");
 const [farmer,verification,inspection]=await Promise.all([
  tx.account.findUnique({where:{id:supply.farmerId},select:{role:true,status:true}}),
  tx.farmerVerification.findUnique({where:{farmerId:supply.farmerId},select:{status:true}}),
  tx.supplyInspectionAssessment.findFirst({where:{supplyId:id},orderBy:[{createdAt:"desc"},{id:"desc"}]})
 ]);
 if(!farmer||farmer.role!=="FARMER"||farmer.status!=="ACTIVE"||verification?.status!=="VERIFIED")
  conflict("Supplier is not verified and active.");
 if(!inspection||inspection.observedUnit!==supply.unit||inspection.observedQuantity.lte(0))
  conflict("A current physical inspection with matching unit and positive quantity is required.");
 const eligible=Prisma.Decimal.min(supply.quantity,inspection.observedQuantity);
 if(eligible.lte(0))conflict("No inspected physical quantity is eligible.");
 return {supply,inspection,eligible};
}
export async function lockLot(tx:Tx,id:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "supply_lots" WHERE "id" = $1::uuid FOR UPDATE',id);
 const lot=await tx.supplyLot.findUnique({where:{id}});
 if(!lot)throw new PublicError(404,"Physical sourced lot not found.");
 return lot;
}
export async function assignedRequest(tx:Tx,id:string,reviewerId:string){
 await tx.$queryRawUnsafe('SELECT "id" FROM "buyer_requests" WHERE "id" = $1::uuid FOR UPDATE',id);
 const request=await tx.buyerRequest.findUnique({where:{id},include:{assignment:true,organization:true}});
 if(!request||request.status!=="SOURCING_IN_PROGRESS"||request.assignment?.assignedToId!==reviewerId)
  throw new PublicError(403,"An active sourcing request and its assigned Operations reviewer are required.");
 if(request.organization.verificationStatus!=="VERIFIED")
  conflict("Independent business verification is required before reserving a buyer order.");
 return request;
}
