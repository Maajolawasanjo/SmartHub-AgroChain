import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function FarmerDashboard(){
 const {account,db}=await requirePortal("FARMER");
 const [verification,crops,supplies,harvests]=await Promise.all([
  db.farmerVerification.findUnique({where:{farmerId:account.id}}),
  db.farmerCrop.count({where:{farmerId:account.id}}),
  db.supplyDeclaration.count({where:{farmerId:account.id}}),
  db.farmerCrop.count({where:{farmerId:account.id,expectedHarvestAt:{gte:new Date()},stage:{in:["PLANNED","GROWING"]}}}),
 ]);
 const status=verification?.status||"PROFILE_INCOMPLETE";
 const primary= !verification?{label:"Complete farm profile",href:"/farmer/kyc"}:
  status==="MORE_INFO_REQUIRED"||status==="REJECTED"?{label:"Review verification feedback",href:"/farmer/kyc"}:
  status==="PENDING_REVIEW"?{label:"View verification status",href:"/farmer/kyc"}:
  status==="VERIFIED"&&crops===0?{label:"Add your first crop",href:"/farmer/my-supply/crops/new"}:
  status==="VERIFIED"&&supplies===0?{label:"Declare available supply",href:"/farmer/my-supply/available/new"}:{label:"View my supply",href:"/farmer/my-supply"};
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer" title={`Welcome back, ${account.fullName}`} subtitle="Manage your farm information, update your supply, explore relevant opportunities and track your transactions.">
  <div className="agro-toolbar"><StateTag status={status}/><Link className="action action-primary" href={primary.href}>{primary.label}</Link></div>
  <div className="agro-grid">
   <section className="agro-panel"><h2>My Supply</h2><div className="agro-number">{supplies+crops}</div><p>Crop and declared-supply records</p><Link className="action action-outline" href="/farmer/my-supply">View My Supply</Link></section>
   <section className="agro-panel"><h2>Expected Harvests</h2><div className="agro-number">{harvests}</div><p>Recorded expected harvests</p><Link className="action action-outline" href="/farmer/my-supply/crops">View Harvests</Link></section>
   <section className="agro-panel"><h2>Active Transactions</h2><p>Not enabled yet</p><p className="agro-hint">Will show actual confirmed transactions when the orders module is implemented.</p><Link className="action action-outline" href="/farmer/orders">See status</Link></section>
   <section className="agro-panel"><h2>Matched Opportunities</h2><p>Not enabled yet</p><p className="agro-hint">Matching will be introduced with real buyer demand.</p><Link className="action action-outline" href="/farmer/opportunities">See status</Link></section>
  </div>
  {crops===0?<EmptyState title="Start by adding your crops" body="Add the crops you are growing so you can keep track of planting dates and expected harvests." action="Add your first crop" href="/farmer/my-supply/crops/new"/>:<section className="agro-panel"><h2>Farm Progress</h2><p>You have {crops} recorded crop{crops===1?"":"s"} and {harvests} upcoming expected harvest{harvests===1?"":"s"}. Estimated quantities are not available physical supply.</p><Link className="action action-outline" href="/farmer/my-supply/crops">View crops</Link></section>}
  <section className="agro-panel"><h2>SmartHub Support</h2><p>Need help with verification or your supply records? Use the approved support channels.</p><Link className="action action-outline" href="/contact">Contact support</Link></section>
 </PortalFrame>;
}
