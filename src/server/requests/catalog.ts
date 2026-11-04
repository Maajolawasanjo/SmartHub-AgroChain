import "server-only";
import {getPrisma} from "@/server/db/prisma";
export async function requestCatalog(db:ReturnType<typeof getPrisma>,preferredId?:string){
 const where={active:true,publicPublished:true,category:{is:{active:true}}};
 const select={id:true,name:true,types:{where:{publicPublished:true},select:{id:true,name:true},orderBy:{name:"asc" as const}},specifications:{where:{publicPublished:true},select:{id:true,name:true},orderBy:{name:"asc" as const}}};
 const commodities=await db.commodity.findMany({where,select,orderBy:{name:"asc"},take:200});
 if(preferredId&&!commodities.some(c=>c.id===preferredId)){
  const preferred=await db.commodity.findFirst({where:{...where,id:preferredId},select});
  if(preferred)commodities.push(preferred);
 }
 return commodities;
}
