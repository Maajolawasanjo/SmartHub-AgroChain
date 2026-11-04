import "server-only";
import {redirect} from "next/navigation";
import {getAccountContext,accountDestination} from "@/server/auth/context";
import {PublicError,requireConfig} from "@/server/auth/http";
import {getPrisma} from "@/server/db/prisma";

export async function requireBuyerPage(){
 const ctx=await getAccountContext();if(!ctx)redirect("/login");
 const next=accountDestination(ctx);
 if(["/verify-email","/verify-phone","/account/status"].includes(next))redirect(next);
 if(ctx.account.role!=="BUYER")redirect("/forbidden");
 return {...ctx,db:getPrisma()};
}
export async function requireBuyerApi(){
 requireConfig();const ctx=await getAccountContext();if(!ctx)throw new PublicError(401,"Sign in to continue.");
 if(ctx.account.status!=="ACTIVE"||!ctx.user.email_confirmed_at||ctx.account.role!=="BUYER")throw new PublicError(403,"Active buyer access is required.");
 return {...ctx,db:getPrisma()};
}
export async function buyerMembership(db:ReturnType<typeof getPrisma>,accountId:string){
 return db.buyerMembership.findUnique({where:{accountId},include:{organization:true}});
}
