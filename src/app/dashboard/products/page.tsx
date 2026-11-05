import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceEmpty} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage} from "@/server/buyer/guard";
import {publicProducts,safeCatalogSearch} from "@/lib/public/catalog";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function BuyerProducts({searchParams}:{searchParams:Promise<{q?:string;category?:string}>}){
 const {account}=await requireBuyerPage();const params=await searchParams;const q=safeCatalogSearch(params.q??"");const category=(params.category??"").slice(0,90);
 const catalog=await publicProducts(q,category);
 return <DashboardFrame role="BUYER" name={account.fullName} title="Products & Supply" description="Discover published agricultural commodities. Current stock, price and delivery are not guaranteed by catalogue publication.">
 <section className="buyer-panel"><form action="/dashboard/products" method="get" role="search" className="buyer-catalog-filter"><div className="buyer-field"><label htmlFor="buyer-search">Search commodities</label><input id="buyer-search" name="q" maxLength={80} defaultValue={q} placeholder="Search by product or variety"/></div><div className="buyer-field"><label htmlFor="buyer-category">Category</label><select id="buyer-category" name="category" defaultValue={category}><option value="">All categories</option>{catalog.categories.map(c=><option value={c.slug} key={c.slug}>{c.name}</option>)}</select></div><button type="submit" className="action action-primary">Search</button></form></section>
 {catalog.state!=="ready"?<WorkspaceEmpty title="Catalogue currently unavailable" description="We cannot load the published catalogue right now. No stock or prices can be confirmed." href="/contact?interest=buyer" action="Contact sourcing team"/>:catalog.items.length?<div className="buyer-product-grid">{catalog.items.map(c=><article className="buyer-product" key={c.id}><span className="buyer-kicker">{c.category?.name??"Agricultural commodity"}</span><h2>{c.name}</h2><p>{c.description??"Commodity details are confirmed with SmartHub during sourcing."}</p><p className="buyer-muted">Requestable commodity · Availability on request</p><Link className="action action-outline" href={`/dashboard/products/${c.slug}`}>View commodity</Link><Link className="action action-primary" href={`/dashboard/requests/new?commodityId=${c.id}`}>Request this commodity</Link></article>)}</div>:<WorkspaceEmpty title="No matching published commodities" description="Try different filters or contact SmartHub about a sourcing requirement." href="/contact?interest=buyer" action="Contact SmartHub"/>}
 <section className="buyer-note">Published catalogue records do not imply confirmed stock, a certified grade, a price, a supplier identity or an order.</section>
 </DashboardFrame>;
}
