import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Platform" },
  { href: "/products", label: "Products" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-buyers", label: "For Buyers" },
  { href: "/for-farmers", label: "For Farmers" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return <header className="border-b border-[#dce6dd] bg-white">
    <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
      <Link href="/" className="font-extrabold text-xl tracking-tight text-[#123d2b]" aria-label="SmartHub AgroChain home">SmartHub <span className="text-[#a87925]">AgroChain</span></Link>
      <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#385645]">
        {links.map(link => <Link key={link.href} className="hover:underline" href={link.href}>{link.label}</Link>)}
      </nav>
      <Link className="action action-outline text-sm" href="/login">Sign in</Link>
    </div>
  </header>;
}
