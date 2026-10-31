import Link from "next/link";
import {PortalFrame,StateTag,EmptyState,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function MySupply(){
 const {account,db}=await requirePortal("FARMER");
 const [crops,supplies,waiting,drafts]=await Promise.all([
 db.farmerCrop.count({where:{farmerId:account.id}}),db.supplyDeclaration.count({where:{farmerId:account.id}}),
 db.supplyDeclaration.count({where:{farmerId:account.id,status:"PENDING_REVIEW"}}),
 db.supplyDeclaration.count({where:{farmerId:account.id,status:"DRAFT"}})
 ]);
 return <PortalFrame role="FARMER" name={account.fullName} route="/farmer/my-supply" title="My Supply" subtitle="Manage growing crops, physically available produce, drafts and review status separately.">
  <div className="agro-toolbar"><Link className="action action-primary" href="/farmer/my-supply/crops/new">Add Crop</Link><Link className="action action-outline" href="/farmer/my-supply/available/new">Declare Available Supply</Link></div>
  <div className="agro-grid">{[["My Crops",crops,"/farmer/my-supply/crops"],["Available Supply",supplies,"/farmer/my-supply/available"],["Drafts",drafts,"/farmer/my-supply/drafts"],["Pending Review",waiting,"/farmer/my-supply/review-status"]].map(([label,n,url])=><section className="agro-panel" key={String(label)}><h2>{label}</h2><div className="agro-number">{n}</div><Link className="action action-outline" href={String(url)}>Open</Link></section>)}</div>
  <div className="agro-alert">A growing crop or estimated harvest is not currently available stock. Supply approval is separate from verification, stock reservation, orders and settlement.</div>
 </PortalFrame>;
}
