import Link from "next/link";
import {notFound} from "next/navigation";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
import {CropForm,SupplyForm} from "@/features/agriculture/forms";
export const dynamic="force-dynamic";
export default async function SupplyPath({params}:{params:Promise<{slug:string[]}>}){
 const slug=(await params).slug;
 const [section,part,extra]=slug;
 if(!["crops","available","drafts","review-status"].includes(section)||extra)notFound();
 const {account,db}=await requirePortal("FARMER");
 const base="/farmer/my-supply";
 const [farms,commodities]=await Promise.all([
 db.farm.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"}}),
 db.commodity.findMany({where:{active:true},orderBy:{name:"asc"}})
 ]);
 const farmItems=farms.map(f=>({id:f.id,name:`${f.name} — ${f.lga}, ${f.state}`}));
 const commodityItems=commodities.map(c=>({id:c.id,name:c.name}));
 const isCrop=section==="crops";const isAvailable=section==="available";
 if((isCrop||isAvailable)&&part==="new"){
  const crops=await db.farmerCrop.findMany({where:{farmerId:account.id},include:{commodity:true}});
  return <PortalFrame role="FARMER" name={account.fullName} route={base} title={isCrop?"Add Crop":"Add Available Supply"} subtitle={isCrop?"Record the crops you grow. Estimates are not physical stock.":"Declare only actual physical produce available for SmartHub review."}>
    {!farms.length?<EmptyState title="Register a farm first" body="A crop or supply record must be associated with one of your real registered farms." action="Go to farm registration" href="/farmer/kyc"/>:
    !commodities.length?<EmptyState title="No supported commodities configured" body="Operations must create and activate commodities before you can register crops or supply. No fabricated catalog entries are shown." action="Contact SmartHub" href="/contact"/>:
    isCrop?<CropForm farms={farmItems} commodities={commodityItems}/>:<SupplyForm farms={farmItems} commodities={commodityItems} crops={crops.map(c=>({id:c.id,name:`${c.commodity.name}${c.variety?` — ${c.variety}`:""}`,farmId:c.farmId,commodityId:c.commodityId}))}/>}
   </PortalFrame>;
 }
 if(isCrop&&part){
  const crop=await db.farmerCrop.findFirst({where:{id:part,farmerId:account.id},include:{commodity:true,farm:true}});
  if(!crop)notFound();
  return <PortalFrame role="FARMER" name={account.fullName} route={base} title={crop.commodity.name} subtitle="Your crop record — not an available-stock declaration.">
   <section className="agro-panel"><StateTag status={crop.stage}/><p>Farm: {crop.farm.name}</p><p>Variety: {crop.variety||"Not recorded"}</p><p>Expected harvest: {crop.expectedHarvestAt?.toLocaleDateString("en-NG")||"Not recorded"}</p><p>Estimated yield: {crop.estimatedQuantity?`${crop.estimatedQuantity.toString()} ${crop.estimatedUnit}`:"Not recorded"}</p><Link className="action action-primary" href={`${base}/available/new`}>Declare harvested supply</Link></section>
  </PortalFrame>;
 }
 if(isAvailable&&part){
  const supply=await db.supplyDeclaration.findFirst({where:{id:part,farmerId:account.id},include:{commodity:true,farm:true,events:{orderBy:{createdAt:"desc"},take:10}}});
  if(!supply)notFound();
  const editable=["DRAFT","MORE_INFO_REQUIRED","REJECTED"].includes(supply.status);
  const crops=editable?await db.farmerCrop.findMany({where:{farmerId:account.id},include:{commodity:true}}):[];
  return <PortalFrame role="FARMER" name={account.fullName} route={base} title={`${supply.commodity.name} · Supply`} subtitle="View your actual saved declaration and Operations review decisions.">
   <section className="agro-panel"><StateTag status={supply.status}/><p>Farm: {supply.farm.name}</p><p>Declared quantity: {supply.quantity.toString()} {supply.unit}</p><p>Condition (farmer-reported): {supply.reportedCondition}</p>{supply.feedback&&<p className="agro-alert">Operations feedback: {supply.feedback}</p>}</section>
   {editable?<><h2 className="text-xl font-bold mb-3">Edit and resubmit</h2><SupplyForm id={supply.id} farms={farmItems} commodities={commodityItems} crops={crops.map(c=>({id:c.id,name:c.commodity.name,farmId:c.farmId,commodityId:c.commodityId}))} record={{farmId:supply.farmId,commodityId:supply.commodityId,cropId:supply.cropId||"",variety:supply.variety||"",quantity:supply.quantity.toString(),unit:supply.unit,packaging:supply.packaging||"",harvestDate:supply.harvestDate?.toISOString().slice(0,10)||"",reportedCondition:supply.reportedCondition,storageNote:supply.storageNote||"",notes:supply.notes||""}}/></>:<p className="agro-alert">This record is currently locked from farmer edits. Contact Operations if a correction is needed.</p>}
   <section className="agro-panel"><h2>Review timeline</h2>{supply.events.map(e=><p key={e.id} className="mt-2"><StateTag status={e.status}/> · {e.createdAt.toLocaleDateString("en-NG")}{e.note?` — ${e.note}`:""}</p>)}</section>
  </PortalFrame>;
 }
 if(isCrop){const crops=await db.farmerCrop.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"},include:{commodity:true,farm:true}});
  return <PortalFrame role="FARMER" name={account.fullName} route={base} title="My Crops" subtitle="Keep track of the crops you grow and update their progress as your harvest approaches."><div className="agro-toolbar"><Link className="action action-primary" href={`${base}/crops/new`}>Add Crop</Link></div>{crops.length?<div className="agro-data-list">{crops.map(c=><div className="agro-record" key={c.id}><div><h2>{c.commodity.name}{c.variety?` · ${c.variety}`:""}</h2><p>{c.farm.name} · {c.expectedHarvestAt?`Expected ${c.expectedHarvestAt.toLocaleDateString("en-NG")}`:"No harvest date"}</p></div><StateTag status={c.stage}/><Link href={`${base}/crops/${c.id}`}>Details</Link></div>)}</div>:<EmptyState title="No crops added yet" body="Add a crop to keep track of your farm activities and expected harvest." action="Add Crop" href={`${base}/crops/new`}/>}</PortalFrame>;
 }
 const status=section==="drafts"?["DRAFT"]:section==="review-status"?["PENDING_REVIEW","MORE_INFO_REQUIRED","REJECTED","APPROVED"]:undefined;
 const supplies=await db.supplyDeclaration.findMany({where:{farmerId:account.id,...(status?{status:{in:status as ("DRAFT"|"PENDING_REVIEW"|"MORE_INFO_REQUIRED"|"REJECTED"|"APPROVED")[]}}:{})},orderBy:{createdAt:"desc"},include:{commodity:true}});
 const title=section==="drafts"?"Supply Drafts":section==="review-status"?"Supply Review Status":"Available Supply";
 return <PortalFrame role="FARMER" name={account.fullName} route={base} title={title} subtitle="Your farmer-reported produce declarations and their actual review status.">
 <div className="agro-toolbar"><Link className="action action-primary" href={`${base}/available/new`}>Add Available Supply</Link><Link className="action action-outline" href={base}>My Supply</Link></div>
 {supplies.length?<div className="agro-data-list">{supplies.map(s=><div className="agro-record" key={s.id}><div><h2>{s.commodity.name}</h2><p>{s.quantity.toString()} {s.unit} · {s.createdAt.toLocaleDateString("en-NG")}</p></div><StateTag status={s.status}/><Link href={`${base}/available/${s.id}`}>View</Link></div>)}</div>:<EmptyState title="No supply records here yet" body="When you submit harvested produce, its saved status and review feedback will appear here." action="Declare available supply" href={`${base}/available/new`}/>}
 </PortalFrame>;
}
