import Link from "next/link";
import {notFound} from "next/navigation";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage,buyerMembership} from "@/server/buyer/guard";
import {publicProduct} from "@/lib/public/catalog";
import {BuyerSpecificationForm} from "@/features/buyer/forms";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerProductDetail({params}:{params:Promise<{slug:string}>}){
 const {account,db}=await requireBuyerPage();const {slug}=await params;const product=await publicProduct(slug);
 if(product.state==="invalid"||(product.state==="ready"&&!product.item))notFound();
 const member=await buyerMembership(db,account.id);
 return <DashboardFrame role="BUYER" name={account.fullName} title={product.item?.name??"Commodity details"} description="Published commodity information and reusable sourcing preferences.">
 <p className="buyer-back"><Link href="/dashboard/products">← All Products & Supply</Link></p>
 {product.state!=="ready"||!product.item?<WorkspaceEmpty title="Product information is unavailable" description="We cannot load this published commodity at the moment. Please try again later." href="/dashboard/products" action="Return to products"/>:<>
 <section className="buyer-panel"><span className="buyer-kicker">{product.item.category?.name??"Agricultural commodity"}</span><h2>{product.item.name}</h2><p>{product.item.description??"Detailed sourcing information is confirmed during request review."}</p><p className="buyer-note">Availability on request. No live quantity, supplier contact, price, grade or delivery guarantee is implied.</p>
 {product.item.types.length>0&&<><h3>Published types</h3><p>{product.item.types.map(t=>t.name).join(" · ")}</p></>}{product.item.specifications.length>0&&<><h3>Published specification options</h3><p>{product.item.specifications.map(s=>s.name).join(" · ")}</p></>}<Link className="action action-primary" href={`/dashboard/requests/new?commodityId=${product.item.id}`}>Request this commodity</Link></section>
 <section className="buyer-panel"><h2>Save a sourcing template</h2><p className="buyer-muted">Store your preferred quantity, specification and region for future sourcing requests. This does not submit a request or reserve stock.</p>{member&&["OWNER","EDITOR"].includes(member.role)?<BuyerSpecificationForm commodity={{id:product.item.id,name:product.item.name}} types={product.item.types} specifications={product.item.specifications}/>:<p className="buyer-note">Complete your business profile before saving sourcing templates. <Link href="/dashboard/settings">Set up your business</Link>.</p>}</section>
 </>}
 </DashboardFrame>;
}
