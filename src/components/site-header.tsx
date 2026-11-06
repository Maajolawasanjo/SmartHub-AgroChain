import Link from "next/link";
import { BrandLink } from "./ui/brand";
const nav=[
 ["Platform","/product"],["How it works","/how-it-works"],
 ["For buyers","/for-buyers"],["For farmers","/for-farmers"],
 ["Products","/products"],["About us","/about"],["Help","/help"]
] as const;
export function SiteHeader(){
 return <header className="public-header">
  <div className="container public-header-inner">
   <Link href="/" className="public-logo" aria-label="SmartHub AgroChain — homepage">SmartHub <span>AgroChain</span></Link>
   <nav className="public-desktop-nav" aria-label="Primary navigation">
    {nav.map(([name,path])=><Link key={path} href={path}>{name}</Link>)}
   </nav>
   <div className="public-actions"><Link href="/login" className="public-login">Sign in</Link>
    <BrandLink variant="primary" className="action action-primary" href="/contact?interest=buyer">Discuss sourcing <span aria-hidden="true">↗</span></BrandLink>
   </div>
   <details className="public-mobile-menu"><summary aria-label="Open website navigation">Menu <span aria-hidden="true">☰</span></summary>
    <nav aria-label="Mobile navigation">{nav.map(([name,path])=><Link key={path} href={path}>{name}</Link>)}
     <Link href="/partnerships">Partnerships</Link><Link href="/insights">Insights</Link>
     <Link href="/contact">Contact us</Link><Link href="/login">Sign in</Link>
    </nav></details>
  </div>
 </header>;
}
