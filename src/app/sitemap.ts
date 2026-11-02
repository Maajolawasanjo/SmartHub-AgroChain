import type { MetadataRoute } from "next";
const root="https://www.smarthubagrochain.online";
const staticPages=["", "/product", "/products", "/how-it-works", "/for-buyers", "/for-farmers", "/about", "/insights", "/faq", "/contact", "/accessibility"];
export default function sitemap():MetadataRoute.Sitemap{return staticPages.map(path=>({url:`${root}${path}`,changeFrequency:"monthly" as const}));}
