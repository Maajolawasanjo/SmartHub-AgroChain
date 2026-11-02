import Link from "next/link";
export function SiteFooter() {
  return <footer className="mt-20 bg-[#123d2b] py-12 text-white">
    <div className="container grid gap-9 md:grid-cols-3">
      <div><strong className="text-xl">SmartHub AgroChain</strong><p className="mt-3 max-w-sm text-sm text-[#d2e4d7]">Connecting agricultural supply with real market demand.</p></div>
      <div><strong>Explore</strong><div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#e0eadf]">
        <Link href="/">Home</Link><Link href="/product">Platform</Link><Link href="/products">Products</Link><Link href="/how-it-works">How It Works</Link><Link href="/for-buyers">For Buyers</Link><Link href="/for-farmers">For Farmers</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link>
      </div></div>
      <div><strong>Contact</strong><p className="mt-3 text-sm text-[#e0eadf]">Nigeria</p><a className="mt-2 block text-sm underline" href="mailto:info@smarthubagrochain.online">info@smarthubagrochain.online</a><p className="mt-5 text-xs text-[#c5d8c8]">© {new Date().getFullYear()} SmartHub AgroChain Ltd.</p></div>
    </div>
  </footer>;
}
