import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigReady } from "@/server/auth/env";

// The proxy runs before server pages/route handlers. It must enforce the same
// reviewed Auth/Prisma tenant boundary as the application, otherwise a stray
// Supabase URL/key could refresh cookies against the wrong project.
export async function proxy(request:NextRequest){
 if(!authConfigReady())return NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
 let response=NextResponse.next({request});
 const client=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll();},
   setAll(items){
    items.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   },
  },
 });
 // A transient Auth provider failure should not turn the entire public
 // website into a 500. Protected actions still independently call getUser()
 // and enforce DB-derived role, account status and email/phone verification.
 // Do not accept any claims here as authoritative application permissions.
 try{await client.auth.getClaims();}
 catch{ /* No verified session; downstream authorization remains fail-closed. */ }
 response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"]};
