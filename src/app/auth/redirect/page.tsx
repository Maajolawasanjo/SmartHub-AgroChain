import { redirect } from "next/navigation";
import { getAccountContext, accountDestination } from "@/server/auth/context";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){
 const ctx=await getAccountContext();
 if(!ctx)redirect("/login");
 redirect(accountDestination(ctx));
}
