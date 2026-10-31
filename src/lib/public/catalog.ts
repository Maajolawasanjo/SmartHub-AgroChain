import "server-only";
import {getPrisma} from "@/server/db/prisma";
import type {Prisma} from "@/generated/prisma/client";

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function safeCatalogSlug(input:string){return input.length<=110 && slugPattern.test(input)?input:null;}
export function safeCatalogSearch(input:string){return input.trim().replace(/\s+/g," ").slice(0,80);}

const publicProductSelect={
 id:true,name:true,slug:true,description:true,
 category:{select:{name:true,slug:true}},
 types:{where:{publicPublished:true},select:{id:true,name:true,slug:true,description:true,marketName:true},orderBy:{name:"asc"}},
} as const;

export async function publicProducts(query:string,category:string){
 if(!process.env.DATABASE_URL)return {state:"unconfigured" as const,items:[],categories:[]};
 try {
  const db=getPrisma();
  const where:Prisma.CommodityWhereInput={active:true,publicPublished:true,slug:{not:null},category:{is:{active:true}}};
  if(category && safeCatalogSlug(category))where.category={is:{slug:category,active:true}};
  if(query){where.OR=[{name:{contains:query,mode:"insensitive"}},{description:{contains:query,mode:"insensitive"}},{types:{some:{name:{contains:query,mode:"insensitive"},publicPublished:true}}}];}
  const [items,categories]=await Promise.all([
   db.commodity.findMany({where,select:publicProductSelect,orderBy:{name:"asc"},take:48}),
   db.commodityCategory.findMany({where:{active:true,commodities:{some:{active:true,publicPublished:true,slug:{not:null}}}},orderBy:{name:"asc"},select:{name:true,slug:true}}),
  ]);
  return {state:"ready" as const,items,categories};
 }catch(error){console.error("Public catalog query failure",error instanceof Error?error.name:"unknown");return {state:"error" as const,items:[],categories:[]};}
}

export async function publicProduct(slug:string){
 if(!process.env.DATABASE_URL)return {state:"unconfigured" as const,item:null};
 const normalized=safeCatalogSlug(slug);
 if(!normalized)return {state:"invalid" as const,item:null};
 try{
  const item=await getPrisma().commodity.findFirst({where:{slug:normalized,active:true,publicPublished:true,category:{is:{active:true}}},select:publicProductSelect});
  return {state:"ready" as const,item};
 }catch(error){console.error("Public product query failure",error instanceof Error?error.name:"unknown");return {state:"error" as const,item:null};}
}

export async function publicArticles(){
 if(!process.env.DATABASE_URL)return {state:"unconfigured" as const,items:[]};
 try{const items=await getPrisma().insightArticle.findMany({where:{published:true,publishedAt:{lte:new Date()}},select:{slug:true,title:true,summary:true,category:true,publishedAt:true},orderBy:{publishedAt:"desc"},take:30});return {state:"ready" as const,items};}
 catch(error){console.error("Insights query failure",error instanceof Error?error.name:"unknown");return {state:"error" as const,items:[]};}
}
export async function publicArticle(slug:string){
 if(!process.env.DATABASE_URL)return {state:"unconfigured" as const,item:null};
 const safe=safeCatalogSlug(slug);if(!safe)return {state:"invalid" as const,item:null};
 try{const item=await getPrisma().insightArticle.findFirst({where:{slug:safe,published:true,publishedAt:{lte:new Date()}},select:{title:true,summary:true,category:true,body:true,publishedAt:true}});return {state:"ready" as const,item};}
 catch(error){console.error("Insight detail query failure",error instanceof Error?error.name:"unknown");return {state:"error" as const,item:null};}
}
