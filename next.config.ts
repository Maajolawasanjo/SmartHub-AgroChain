import type { NextConfig } from "next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"}
];
const privateHeaders=[
  {key:"Cache-Control",value:"private, no-store"},
  {key:"X-Robots-Tag",value:"noindex, nofollow"}
];
const privateRoots=["/admin","/dashboard","/farmer","/field-agent","/operations","/inbox","/support","/settings","/activity","/account"];
const nextConfig:NextConfig={
  reactStrictMode:true,
  async headers(){
    return [
      {source:"/:path*",headers:[
        ...securityHeaders,
        ...(process.env.NODE_ENV==="production"?[{key:"Strict-Transport-Security",value:"max-age=15552000"}]:[])
      ]},
      ...privateRoots.map(root=>({source:root+"/:path*",headers:privateHeaders})),
      ...privateRoots.map(root=>({source:root,headers:privateHeaders})),
      {source:"/api/:path*",headers:[{key:"Cache-Control",value:"no-store"}]}
    ];
  }
};

export default nextConfig;
