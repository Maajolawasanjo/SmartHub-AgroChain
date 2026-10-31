import {type NextRequest} from "next/server";
import {z} from "zod";
import {getPrisma} from "@/server/db/prisma";
import {requireActor} from "@/server/agriculture/policies";
import {assertSameOrigin,readJson,reply,errorReply,PublicError} from "@/server/auth/http";
export const runtime="nodejs";
const slug=z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(110);
const uuid=z.uuid();
const input=z.discriminatedUnion("action",[
 z.object({action:z.literal("category"),name:z.string().trim().min(2).max(100),slug,description:z.string().trim().max(900)}),
 z.object({action:z.literal("metadata"),commodityId:uuid,categoryId:uuid,slug,description:z.string().trim().max(1200)}),
 z.object({action:z.literal("type"),commodityId:uuid,name:z.string().trim().min(2).max(120),slug,description:z.string().trim().max(900),marketName:z.string().trim().max(120)}),
 z.object({action:z.literal("publish"),commodityId:uuid,publish:z.boolean()}),
 z.object({action:z.literal("publish-type"),typeId:uuid,publish:z.boolean()}),
 z.object({action:z.literal("insight"),title:z.string().trim().min(10).max(180),slug,summary:z.string().trim().min(30).max(550),category:z.string().trim().min(3).max(80),body:z.string().trim().min(300).max(40000)}),
 z.object({action:z.literal("publish-insight"),articleId:uuid,publish:z.boolean()}),
]);
export async function POST(request:NextRequest){
 try{
  assertSameOrigin(request);
  const {account,db}=await requireActor("OPERATIONS");
  const data=input.parse(await readJson(request));
  const audit=async(action:string,subjectId:string)=>db.auditEvent.create({data:{actorId:account.id,action,subjectId}});
  if(["publish","publish-type","publish-insight"].includes(data.action) && account.role!=="SUPER_ADMIN")
   throw new PublicError(403,"Public publication requires Super Admin approval.");
  switch(data.action){
   case "category":{
    const existing=await db.commodityCategory.findFirst({where:{OR:[{slug:data.slug},{name:{equals:data.name,mode:"insensitive"}}]}});
    if(existing)throw new PublicError(409,"A category with that name or slug already exists.");
    const item=await db.commodityCategory.create({data:{name:data.name,slug:data.slug,description:data.description||null}});
    await audit("CATALOG_CATEGORY_CREATED",item.id);break;
   }
   case "metadata":{
    const category=await db.commodityCategory.findFirst({where:{id:data.categoryId,active:true}});
    if(!category)throw new PublicError(400,"Select an active category.");
    const item=await db.commodity.update({where:{id:data.commodityId},data:{categoryId:category.id,slug:data.slug,description:data.description||null}});
    await audit("CATALOG_METADATA_UPDATED",item.id);break;
   }
   case "type":{
    const item=await db.commodityType.create({data:{commodityId:data.commodityId,name:data.name,slug:data.slug,description:data.description||null,marketName:data.marketName||null}});
    await audit("CATALOG_TYPE_CREATED",item.id);break;
   }
   case "publish":{
    const item=await db.commodity.findUnique({where:{id:data.commodityId},include:{category:true}});
    if(!item)throw new PublicError(404,"Commodity not found.");
    if(data.publish && (!item.active||!item.slug||!item.category?.active||!item.description))throw new PublicError(409,"An active commodity, approved category, slug and description are required before publication.");
    await db.commodity.update({where:{id:item.id},data:{publicPublished:data.publish}});
    await audit(data.publish?"CATALOG_PRODUCT_PUBLISHED":"CATALOG_PRODUCT_UNPUBLISHED",item.id);break;
   }
   case "publish-type":{
    const item=await db.commodityType.findUnique({where:{id:data.typeId},include:{commodity:true}});
    if(!item)throw new PublicError(404,"Commodity type not found.");
    if(data.publish&&!item.commodity.publicPublished)throw new PublicError(409,"Publish the parent commodity first.");
    await db.commodityType.update({where:{id:item.id},data:{publicPublished:data.publish}});
    await audit(data.publish?"CATALOG_TYPE_PUBLISHED":"CATALOG_TYPE_UNPUBLISHED",item.id);break;
   }
   case "insight":{
    const item=await db.insightArticle.create({data:{title:data.title,slug:data.slug,summary:data.summary,category:data.category,body:data.body}});
    await audit("INSIGHT_DRAFT_CREATED",item.id);break;
   }
   case "publish-insight":{
    const item=await db.insightArticle.findUnique({where:{id:data.articleId}});
    if(!item)throw new PublicError(404,"Insight not found.");
    await db.insightArticle.update({where:{id:item.id},data:{published:data.publish,publishedAt:data.publish?(item.publishedAt??new Date()):null}});
    await audit(data.publish?"INSIGHT_PUBLISHED":"INSIGHT_UNPUBLISHED",item.id);break;
   }
  }
  return reply({ok:true,message:"Saved successfully. Review the updated catalog."});
 }catch(err){return errorReply(err);}
}
