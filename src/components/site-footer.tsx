import Link from "next/link";
const explore=[
 ["Platform","/product"],["How it works","/how-it-works"],["Published products","/products"],
 ["About us","/about"],["Insights","/insights"]
] as const;
const participate=[
 ["For buyers","/for-buyers"],["For farmers","/for-farmers"],["Partnerships","/partnerships"],
 ["Discuss sourcing","/contact?interest=buyer"],["Contact us","/contact"]
] as const;
const information=[
 ["Help center","/help"],["Frequently asked questions","/faq"],["Privacy status","/privacy"],
 ["Terms of use","/terms"],["Cookie policy","/cookies"],["Accessibility","/accessibility"]
] as const;
export function SiteFooter(){return <footer className="public-footer">
 <div className="container public-footer-grid">
  <div><Link href="/" className="public-footer-logo">SmartHub AgroChain</Link>
   <p>Building a clearer route between real agricultural demand and reviewed supply.</p>
   <p className="public-footer-caption">Managed sourcing · Nigeria</p>
   <p className="public-footer-caption">Service and geographic availability are confirmed for each sourcing case.</p>
  </div>
  <div><strong>Explore</strong><nav aria-label="Explore SmartHub">{explore.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav></div>
  <div><strong>Participate</strong><nav aria-label="Participation links">{participate.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav></div>
  <div><strong>Information</strong><nav aria-label="Information and policies">{information.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav>
   <a href="mailto:info@smarthubagrochain.online">info@smarthubagrochain.online</a></div>
 </div>
 <div className="container public-footer-base"><span>© {new Date().getFullYear()} SmartHub AgroChain. All rights reserved.</span><span>From the field to real demand.</span></div>
 </footer>;}
