import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{
 return {rules:[{userAgent:"*",allow:"/",disallow:["/login","/signup","/verify-email","/verify-phone","/auth/","/forgot-password","/reset-password","/session-expired","/logout","/account/","/invite/","/dashboard/","/farmer/","/admin/","/field-agent/","/operations/","/api/","/auth-preview","/unauthorized","/forbidden"]}],sitemap:"https://www.smarthubagrochain.online/sitemap.xml"};
}
