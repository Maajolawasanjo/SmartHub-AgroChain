import type { MetadataRoute } from "next";
const pages = ["", "/product", "/products", "/how-it-works", "/for-buyers", "/for-farmers", "/about", "/contact"];
export default function sitemap(): MetadataRoute.Sitemap {return pages.map(path => ({url:`https://www.smarthubagrochain.online${path}`,changeFrequency:"monthly"}));}
