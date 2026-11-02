import Link from "next/link";

const nav = [
  ["Home", "/"], ["Product", "/product"], ["How It Works", "/how-it-works"],
  ["For Buyers", "/for-buyers"], ["For Farmers", "/for-farmers"],
  ["Products", "/products"], ["About Us", "/about"],
  ["Insights", "/insights"], ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  return <header className="public-header">
    <div className="container public-header-inner">
      <Link className="public-logo" href="/" aria-label="SmartHub AgroChain — home">SmartHub <span>AgroChain</span></Link>
      <nav className="public-desktop-nav" aria-label="Primary navigation">{nav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="public-actions"><Link href="/login" className="public-login">Log in</Link><Link className="action action-primary" href="/signup">Get Started</Link></div>
      <details className="public-mobile-menu"><summary aria-label="Toggle site navigation">Menu <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Mobile navigation">{nav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}<Link href="/login">Log in</Link><Link href="/signup">Get Started</Link></nav>
      </details>
    </div>
  </header>;
}
