import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";

type Activity={id:string;label:string;status:string;at:Date;href:string};
export default async function FarmerDashboard(){
 const {account,db}=await requirePortal("FARMER");
 const today=new Date();
 const [verification,farms,crops,supplies,harvests,nextHarvest,approved,pending,activeTransactions,matchedOpportunities,verificationEvents,supplyEvents,newCrops]=await Promise.all([
  db.farmerVerification.findUnique({where:{farmerId:account.id}}),
  db.farm.count({where:{farmerId:account.id}}),
  db.farmerCrop.count({where:{farmerId:account.id}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:{not:"WITHDRAWN"}}}),
  db.farmerCrop.count({where:{farmerId:account.id,expectedHarvestAt:{gte:today},stage:{in:["PLANNED","GROWING"]}}}),
  db.farmerCrop.findFirst({where:{farmerId:account.id,expectedHarvestAt:{gte:today},stage:{in:["PLANNED","GROWING"]}},orderBy:{expectedHarvestAt:"asc"},select:{expectedHarvestAt:true}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:"APPROVED"}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:"PENDING_REVIEW"}}),
  // Count distinct active orders with this farmer's actual reserved supply, never invitations as orders.
  db.order.count({where:{lines:{some:{lot:{supply:{farmerId:account.id}}}},OR:[
   {status:"PENDING_PAYMENT",holdExpiresAt:{gt:today}},
   {status:{in:["PAYMENT_VERIFIED","PAYMENT_REVIEW","DELIVERY_REVIEW","FULFILLING"]}}
  ]}}),
  // Only open, eligible Operations invitations count as actionable matched opportunities.
  db.matchProposal.count({where:{supply:{farmerId:account.id},status:"INVITED",requestLine:{request:{status:"SOURCING_IN_PROGRESS"}}}}),
  db.farmerVerificationEvent.findMany({where:{verification:{farmerId:account.id}},orderBy:{createdAt:"desc"},take:3}),
  db.supplyReviewEvent.findMany({where:{supply:{farmerId:account.id}},orderBy:{createdAt:"desc"},take:3,include:{supply:{include:{commodity:true}}}}),
  db.farmerCrop.findMany({where:{farmerId:account.id},orderBy:{createdAt:"desc"},take:3,include:{commodity:true}}),
 ]);
 const status=verification?.status||"PROFILE_INCOMPLETE";
 const primary=farms===0?{label:"Complete Your Profile",href:"/farmer/kyc"}:
  status==="MORE_INFO_REQUIRED"||status==="REJECTED"?{label:"Update Your Profile",href:"/farmer/kyc"}:
  status==="PENDING_REVIEW"?{label:"View Verification Status",href:"/farmer/kyc"}:
  status!=="VERIFIED"?{label:"Submit for Verification",href:"/farmer/kyc"}:
  crops===0?{label:"Add Your First Crop",href:"/farmer/my-supply/crops/new"}:
  supplies===0?{label:"Add Available Supply",href:"/farmer/my-supply/available/new"}:
  {label:"View My Supply",href:"/farmer/my-supply"};
 const activity:Activity[]=[
  ...verificationEvents.map(e=>({id:`verification-${e.id}`,label:"Farm verification updated",status:e.status,at:e.createdAt,href:"/farmer/kyc"})),
  ...supplyEvents.map(e=>({id:`supply-${e.id}`,label:`${e.supply.commodity.name} supply updated`,status:e.status,at:e.createdAt,href:`/farmer/my-supply/available/${e.supplyId}`})),
  ...newCrops.map(c=>({id:`crop-${c.id}`,label:`${c.commodity.name} crop recorded`,status:c.stage,at:c.createdAt,href:`/farmer/my-supply/crops/${c.id}`})),
 ].sort((a,b)=>b.at.getTime()-a.at.getTime()).slice(0,3);
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer" title={`Welcome back, ${account.fullName}`} subtitle="Manage your farm information, update your supply, explore relevant opportunities and track your transactions.">
  <div className="agro-toolbar"><StateTag status={status}/><Link className="action action-primary" href={primary.href}>{primary.label}</Link></div>
  <div className="agro-grid">
   <section className="agro-panel"><h2>My Supply</h2><div className="agro-number">{crops+supplies}</div><p>{crops} crop records · {supplies} non-withdrawn supply declarations</p><Link className="action action-outline" href="/farmer/my-supply">View My Supply</Link></section>
   <section className="agro-panel"><h2>Expected Harvests</h2><div className="agro-number">{harvests}</div><p>{nextHarvest?.expectedHarvestAt?`Next expected: ${nextHarvest.expectedHarvestAt.toLocaleDateString("en-NG")}`:"No upcoming harvest date recorded"}</p><Link className="action action-outline" href="/farmer/my-supply/crops">View Harvests</Link></section>
   <section className="agro-panel"><h2>Active Transactions</h2><div className="agro-number">{activeTransactions}</div><p>Track your current orders and fulfilment.</p><p className="agro-hint">Includes valid provisional holds and ongoing orders; excludes completed, cancelled and expired orders. A hold is not payment or settlement.</p><Link className="action action-outline" href="/farmer/orders">View Transactions</Link></section>
   <section className="agro-panel"><h2>Matched Opportunities</h2><div className="agro-number">{matchedOpportunities}</div><p>See opportunities relevant to your supply.</p><p className="agro-hint">Counts only active, recorded invitations awaiting your response; interest does not guarantee a sale.</p><Link className="action action-outline" href="/farmer/opportunities">View Opportunities</Link></section>
  </div>
  {farms===0?<EmptyState title="Let's Set Up Your Farm" body="Complete your farm details and submit them for SmartHub verification. Profile completion does not mean approval." action="Continue Setup" href="/farmer/kyc"/>:
   <section className="agro-panel"><h2>Farm Progress</h2><p>{farms} registered farm{farms===1?"":"s"} · {crops} crop record{crops===1?"":"s"} · {approved} approved supply declaration{approved===1?"":"s"} · {pending} awaiting review.</p><p className="agro-hint">Harvest estimates and approved supply are separate from confirmed physical stock and orders.</p><Link className="action action-outline" href="/farmer/my-supply">Review farm activity</Link></section>}
  <section className="agro-panel"><h2>Recent Activity</h2><p>Stay updated on changes to your farm records and transactions.</p>{activity.length?<div className="agro-data-list">{activity.map(a=><div className="agro-record" key={a.id}><div><h3>{a.label}</h3><p>{a.at.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}</p></div><StateTag status={a.status}/><Link href={a.href}>View</Link></div>)}</div>:<p>No recent activity. Updates to your farm records will appear here.</p>}</section>
  <section className="agro-panel"><h2>Need Help?</h2><p>Contact SmartHub for assistance with your profile, supply records or transactions.</p><Link className="action action-outline" href="/contact">Contact Support</Link></section>
 </PortalFrame>;
}
