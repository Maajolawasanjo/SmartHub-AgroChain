import Link from "next/link";
import {PortalFrame,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function MySupply(){
 const {account,db}=await requirePortal("FARMER");
 const [crops,supplies,waiting,drafts,approved,changes]=await Promise.all([
  db.farmerCrop.count({where:{farmerId:account.id}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:{not:"WITHDRAWN"}}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:"PENDING_REVIEW"}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:"DRAFT"}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:"APPROVED"}}),
  db.supplyDeclaration.count({where:{farmerId:account.id,status:{in:["MORE_INFO_REQUIRED","REJECTED"]}}}),
 ]);
 const cards=[
  {title:"My Crops",count:crops,href:"/farmer/my-supply/crops",detail:"Growing and harvested crop records"},
  {title:"Supply Declarations",count:supplies,href:"/farmer/my-supply/available",detail:"All non-withdrawn physical supply records"},
  {title:"Drafts",count:drafts,href:"/farmer/my-supply/drafts",detail:"Saved but not submitted"},
  {title:"Pending Review",count:waiting,href:"/farmer/my-supply/review-status",detail:"Awaiting Operations decision"},
  {title:"Approved for Matching",count:approved,href:"/farmer/my-supply/review-status",detail:"Eligible for internal assessment, not reserved"},
  {title:"Needs Attention",count:changes,href:"/farmer/my-supply/review-status",detail:"Additional information or a correction needed"},
 ];
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/my-supply" title="My Supply" subtitle="Manage growing crops, physically available produce, drafts and review status separately.">
  <div className="agro-toolbar"><Link className="action action-primary" href="/farmer/my-supply/crops/new">Add Crop</Link><Link className="action action-outline" href="/farmer/my-supply/available/new">Declare Available Supply</Link></div>
  <div className="agro-grid">{cards.map(c=><section className="agro-panel" key={c.title}><h2>{c.title}</h2><div className="agro-number">{c.count}</div><p>{c.detail}</p><Link className="action action-outline" href={c.href}>View records</Link></section>)}</div>
  <div className="agro-alert">Expected harvest is not physical stock. Farmer-declared supply is not independently verified until SmartHub reviews it. Approval does not reserve stock or create an order.</div>
 </PortalFrame>;
}
