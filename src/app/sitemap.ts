import type {MetadataRoute} from "next";
const base="https://www.smarthubagrochain.online";
const published=[
 "/","/product","/how-it-works","/for-buyers","/for-farmers","/products",
 "/about","/partnerships","/insights","/faq","/help","/contact","/accessibility"
];
export default function sitemap():MetadataRoute.Sitemap{
 return published.map(path=>({url:base+(path==="/"?"/":path),changeFrequency:"monthly" as const,priority:path==="/"?1:.6}));
}
