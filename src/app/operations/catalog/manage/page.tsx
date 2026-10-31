import Link from "next/link";
import {requirePortal,PortalFrame,EmptyState} from "@/components/agriculture/portal-frame";
import {CatalogAction,PublicationAction} from "@/components/public/catalog-admin-form";
export const dynamic="force-dynamic";
export default async function CatalogManage(){const {account,db}=await requirePortal("OPERATIONS");
 const [categories,commodities,insights]=await Promise.all([
  db.commodityCategory.findMany({orderBy:{name:"asc"}}),
  db.commodity.findMany({orderBy:{name:"asc"},include:{category:true,types:{orderBy:{name:"asc"}}}}),
  db.insightArticle.findMany({orderBy:{createdAt:"desc"},take:50}),
 ]);
 const isAdmin=account.role==="SUPER_ADMIN";
 return <PortalFrame name={account.fullName} role="OPERATIONS" route="/operations/catalog" title="Public Catalog & Insights Management" subtitle="Maintain real product references. Publication requires Super Admin approval; never publish stock or supplier identities from this screen.">
 <p><Link href="/operations/catalog" className="action action-outline">← Commodity Catalog</Link> <Link href="/products" className="action action-outline">View public products</Link></p>
 <h2 className="text-xl font-bold my-5">Add category</h2>
 <CatalogAction action="category" submitLabel="Save category"><label className="agro-field">Category name<input name="name" minLength={2} maxLength={100} required/></label><label className="agro-field">URL slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="roots-and-tubers" required/></label><label className="agro-field">Description<input name="description" maxLength={900}/></label></CatalogAction>
 <h2 className="text-xl font-bold my-5">Commodity publication metadata</h2>
 {!commodities.length?<EmptyState title="No commodities configured" body="Create a real commodity in the existing Operations catalog before preparing public metadata." action="Create commodity" href="/operations/catalog"/>:
 commodities.map(c=><section className="agro-panel" key={c.id}><div className="agro-record"><strong>{c.name}</strong><span>{c.publicPublished?"Published":"Not published"}</span>{isAdmin&&<PublicationAction action="publish" id={c.id} publish={!c.publicPublished} label={c.publicPublished?"Unpublish":"Approve & Publish"}/>}</div>
 <CatalogAction action="metadata" submitLabel="Save commodity metadata" initial={{commodityId:c.id}}><label className="agro-field">Approved category<select name="categoryId" defaultValue={c.categoryId??""} required><option value="">Select category</option>{categories.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="agro-field">Public slug<input name="slug" defaultValue={c.slug??""} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label><label className="agro-field">Product description<input name="description" maxLength={1200} defaultValue={c.description??""}/></label></CatalogAction>
 <h3 className="font-bold">Types / variations</h3>
 {c.types.map(t=><div className="agro-record" key={t.id}><span>{t.name} · {t.publicPublished?"Published":"Draft"}</span>{isAdmin&&<PublicationAction action="publish-type" id={t.id} publish={!t.publicPublished} label={t.publicPublished?"Unpublish type":"Publish type"}/>}</div>)}
 <CatalogAction action="type" submitLabel="Add product type" initial={{commodityId:c.id}}><label className="agro-field">Type name<input name="name" maxLength={120} required/></label><label className="agro-field">Type slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label><label className="agro-field">Market name (optional)<input name="marketName" maxLength={120}/></label><label className="agro-field">Description<input name="description" maxLength={900}/></label></CatalogAction>
 </section>)}
 <h2 className="text-xl font-bold my-5">Insights editorial drafts</h2>
 <CatalogAction action="insight" submitLabel="Save unpublished insight"><label className="agro-field">Article title<input name="title" minLength={10} maxLength={180} required/></label><label className="agro-field">Article slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label><label className="agro-field">Category<input name="category" maxLength={80} required/></label><label className="agro-field">Summary<textarea name="summary" minLength={30} maxLength={550} required/></label><label className="agro-field">Article body (plain text)<textarea name="body" minLength={300} maxLength={40000} rows={10} required/></label></CatalogAction>
 {insights.map(a=><div key={a.id} className="agro-record"><div><strong>{a.title}</strong><p>{a.published?"Published":"Draft"}</p></div>{isAdmin&&<PublicationAction action="publish-insight" id={a.id} publish={!a.published} label={a.published?"Unpublish":"Approve & Publish"}/>}</div>)}
 <p className="agro-hint">All public publication actions are independently checked against the trusted server-side Super Admin role.</p>
 </PortalFrame>}
