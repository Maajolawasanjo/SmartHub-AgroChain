import Link from "next/link";
const navigation=[
  ["Home","/"],["Product","/product"],["How It Works","/how-it-works"],
  ["For Buyers","/for-buyers"],["For Farmers","/for-farmers"],["Products","/products"],
  ["About Us","/about"],["Insights","/insights"],["Contact","/contact"]
] as const;
export function SiteFooter(){return <footer className="public-footer">
  <div className="container public-footer-grid">
    <div><Link href="/" className="public-footer-logo">SmartHub AgroChain</Link><p>Building technology that connects agricultural supply with real market demand.</p><p className="public-footer-caption">SMARTHUB AGROCHAIN LTD · Nigeria</p></div>
    <div><strong>Explore</strong><nav aria-label="Footer navigation">{navigation.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav></div>
    <div><strong>Get Started</strong><nav aria-label="Participation links"><Link href="/signup?role=buyer">Start a Buyer Request</Link><Link href="/signup?role=farmer">Join as a Farmer</Link><Link href="/contact?interest=partner">Partner With Us</Link></nav></div>
    <div><strong>Contact & Policies</strong><a href="mailto:info@smarthubagrochain.online">info@smarthubagrochain.online</a><nav aria-label="Legal and accessibility"><Link href="/faq">FAQ</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Use</Link><Link href="/cookies">Cookie Policy</Link><Link href="/accessibility">Accessibility</Link></nav></div>
  </div>
  <div className="container public-footer-base"><span>© {new Date().getFullYear()} SmartHub AgroChain Ltd. All rights reserved.</span><span>Where agriculture meets innovation.</span></div>
 </footer>}
