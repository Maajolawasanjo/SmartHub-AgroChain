// Shared read-only HTTP staging acceptance rule. A server failure, an unrelated
// redirect or a rate-limit response is NOT proof that access was denied.
// Requests are made elsewhere with redirect:"manual"; never follow Location.
const denialCodes=new Set([401,403,404]);
const redirectCodes=new Set([301,302,303,307,308]);
const permittedPaths=new Set([
 "/login","/forbidden","/unauthorized","/verify-email","/verify-phone",
 "/account/status","/account/security/mfa","/account/security/operations-mfa"
]);

export function assessAccessDenial(response,reviewedOrigin){
 const status=response?.status;
 if(denialCodes.has(status))return {ok:true,reason:"explicit authorization denial"};
 if(!redirectCodes.has(status))
  return {ok:false,reason:"unexpected status; not evidence of denied access"};
 let origin,location;
 try{
  origin=new URL(reviewedOrigin);
  const destination=response?.headers?.get("location");
  if(!destination)return {ok:false,reason:"redirect lacks Location"};
  location=new URL(destination,origin);
 }catch{return {ok:false,reason:"invalid reviewed origin or redirect"};}
 if(origin.protocol!=="https:"||location.origin!==origin.origin||
    location.username||location.password)
  return {ok:false,reason:"redirect leaves the reviewed staging origin"};
 if(!permittedPaths.has(location.pathname))
  return {ok:false,reason:"redirect is not an expected access-denial destination"};
 return {ok:true,reason:"redirected to an expected access-denial destination"};
}


// Playwright page.goto() follows redirects: the HTTP result is from the FINAL
// document, unlike the manual-redirect read-only HTTP script above. A 200 on a
// known login/verification page is a valid auth redirect; 5xx or a random 200
// on a different page must never count as access protection.
export function assessBrowserDenial(status,finalUrl,requestedPath,reviewedOrigin){
 let origin,finalPage,requestedPage;
 try{
  origin=new URL(reviewedOrigin);
  finalPage=new URL(finalUrl);
  requestedPage=new URL(requestedPath,origin);
 }catch{return {ok:false,reason:"invalid browser navigation URL"};}
 if(origin.protocol!=="https:"||finalPage.origin!==origin.origin||
    requestedPage.origin!==origin.origin||finalPage.username||finalPage.password)
  return {ok:false,reason:"browser navigation escaped the reviewed staging origin"};
 const sameRoute=finalPage.pathname===requestedPage.pathname;
 if(denialCodes.has(status) && (sameRoute||permittedPaths.has(finalPage.pathname)))
  return {ok:true,reason:"explicit forbidden or not-found browser response"};
 if(status===200&&!sameRoute&&permittedPaths.has(finalPage.pathname))
  return {ok:true,reason:"browser redirected to an approved authentication/access-denied page"};
 return {ok:false,reason:"unexpected browser response or destination; not a verified access denial"};
}
