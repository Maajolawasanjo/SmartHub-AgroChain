"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import states from "../data/states.json";
import transitions from "../data/transitions.json";
import { safeInternalPath } from "../auth-rules";
import { ActionNotice } from "./auth-ui";
import { FormForRoute } from "./auth-forms";
import { GenericAction } from "./auth-generic-actions";

type AuthState = (typeof states)[number];

const headline: Record<string,{eyebrow:string;title:string;description:string}> = {
 "/signup":{eyebrow:"Join SmartHub",title:"Create your account",description:"Start as a buyer or farmer. Account verification happens before access to protected services."},
 "/login":{eyebrow:"Welcome back",title:"Sign in to SmartHub",description:"One secure account system for buyers, farmers and invited team members."},
 "/forgot-password":{eyebrow:"Account recovery",title:"Forgot your password?",description:"Request a secure recovery link to the email associated with your SmartHub account."},
 "/verify-email":{eyebrow:"Email confirmation",title:"Verify your email",description:"Check your inbox and spam folder for a confirmation message. Email verification is required for buyers and farmers."},
 "/verify-phone":{eyebrow:"Farmer onboarding",title:"Verify your phone number",description:"Farmers complete a one-time Nigerian SMS verification after their email confirmation."},
 "/auth/confirm":{eyebrow:"Confirmation status",title:"Confirm your email",description:"Your verification link must be checked by Supabase Auth before an email can be marked verified."},
 "/auth/recovery":{eyebrow:"Secure recovery",title:"Check recovery link",description:"Only a trusted recovery session may authorize the next password-reset step."},
 "/reset-password":{eyebrow:"Account recovery",title:"Choose a new password",description:"A real password reset requires a valid recovery session. This form is a frontend-only review."},
 "/reset-password/success":{eyebrow:"Account recovery",title:"Password update outcome",description:"A successful password change must be verified by the authentication provider."},
 "/forgot-password/sent":{eyebrow:"Check your inbox",title:"Password reset email",description:"When email delivery is configured, eligible recovery requests receive a secure link."},
 "/session-expired":{eyebrow:"Session security",title:"Your session has expired",description:"Please sign in again to continue securely."},
 "/logout":{eyebrow:"Account security",title:"Sign-out status",description:"Signed-out state must come from a real provider session termination."},
 "/auth/redirect":{eyebrow:"Account access",title:"Find your permitted area",description:"A trusted server decision determines your dashboard. URL parameters do not grant roles."},
 "/invite/accept":{eyebrow:"SmartHub team",title:"You've been invited",description:"Staff invitations are restricted and validated before credentials, profiles or permissions are provisioned."},
 "/invite/profile":{eyebrow:"Staff onboarding",title:"Complete your staff profile",description:"Complete permitted details only after a valid invitation is accepted."},
 "/invite/complete":{eyebrow:"Staff onboarding",title:"Invitation outcome",description:"An accepted invitation will be confirmed by the trusted account service."},
 "/account/profile":{eyebrow:"My account",title:"My profile",description:"Edit only the fields your account is permitted to change."},
 "/account/security":{eyebrow:"My account",title:"Account security",description:"Manage credentials and verified contact methods using secure steps."},
 "/account/security/password":{eyebrow:"My account",title:"Change password",description:"Password changes require a verified session and, when required, reauthentication."},
 "/account/security/email":{eyebrow:"My account",title:"Change email address",description:"Your new email will only become verified after its confirmation is completed."},
 "/account/security/phone":{eyebrow:"My account",title:"Change phone number",description:"Your new phone number must be verified before becoming an approved contact."},
 "/account/preferences":{eyebrow:"My account",title:"Notification preferences",description:"Choose how SmartHub contacts you when the service is connected."},
 "/account/sessions":{eyebrow:"My account",title:"Device sessions",description:"See and revoke real authenticated sessions once connected."},
 "/account/status":{eyebrow:"Account status",title:"Account requirements",description:"Your verified account state controls what you can access."},
 "/account/delete":{eyebrow:"Privacy and rights",title:"Request account deletion",description:"Review what can be deleted and what business records might need to be retained."},
 "/account/delete/confirm":{eyebrow:"Sensitive action",title:"Confirm deletion request",description:"A sensitive deletion request requires secure identity confirmation."},
 "/forbidden":{eyebrow:"Access control",title:"Access denied",description:"You do not have permission to view this area."},
 "/unauthorized":{eyebrow:"Access control",title:"Sign in required",description:"This area requires a verified authenticated session."},
 "/auth/error":{eyebrow:"Account assistance",title:"Authentication issue",description:"Use a safe recovery option if authentication or callback processing fails."},
 "/account/help":{eyebrow:"Get support",title:"Can't access your account?",description:"Find the appropriate account recovery and support path."},
 "/admin/staff/invite":{eyebrow:"Staff administration",title:"Invite a team member",description:"Only an authorized Super Admin can issue an invitation and grant staff access."},
 "/admin/staff/invites":{eyebrow:"Staff administration",title:"Staff invitations",description:"Review pending, expired and revoked invitations once authenticated."},
 "/admin/staff":{eyebrow:"Staff administration",title:"Team accounts",description:"Manage real employee identities and permissions with audited privileged actions."},
 "/admin/staff/new":{eyebrow:"Staff administration",title:"Add a staff member",description:"Create a staff invitation without allowing public self-assignment of privileged roles."},
};

const related:Record<string,{href:string;label:string}[]> = {
 "/signup":[{href:"/login",label:"Already have an account? Sign in"},{href:"/account/help",label:"Registration help"}],
 "/login":[{href:"/forgot-password",label:"Forgot password"},{href:"/signup",label:"Create account"},{href:"/account/help",label:"Account support"}],
 "/verify-email":[{href:"/login",label:"Back to sign in"},{href:"/account/help",label:"Email access problems"}],
 "/verify-phone":[{href:"/account/security/phone",label:"Change phone number"},{href:"/account/help",label:"SMS support"}],
 "/forgot-password":[{href:"/login",label:"Back to sign in"},{href:"/account/help",label:"Other recovery options"}],
 "/auth/recovery":[{href:"/forgot-password",label:"Request new reset link"},{href:"/login",label:"Sign in"}],
 "/auth/confirm":[{href:"/verify-email",label:"Email verification help"},{href:"/login",label:"Sign in"}],
 "/account/security":[{href:"/account/security/password",label:"Change password"},{href:"/account/security/email",label:"Change email"},{href:"/account/security/phone",label:"Change phone"},{href:"/account/sessions",label:"Device sessions"}],
 "/account/profile":[{href:"/account/security",label:"Account security"},{href:"/account/preferences",label:"Notifications"}],
 "/account/delete":[{href:"/account/delete/confirm",label:"Review confirmation steps"},{href:"/account/help",label:"Ask for help"}],
 "/account/delete/confirm":[{href:"/account/delete",label:"Back to deletion details"}],
 "/account/status":[{href:"/verify-email",label:"Verify email"},{href:"/verify-phone",label:"Verify farmer phone"},{href:"/account/help",label:"Get help"}],
 "/account/help":[{href:"/forgot-password",label:"Reset password"},{href:"/verify-email",label:"Email verification"},{href:"/login",label:"Sign in"}],
 "/invite/accept":[{href:"/account/help",label:"Invitation help"},{href:"/login",label:"Already accepted? Sign in"}],
 "/admin/staff":[{href:"/admin/staff/invite",label:"Invite staff"},{href:"/admin/staff/invites",label:"Review invitations"}],
 "/admin/staff/invites":[{href:"/admin/staff/invite",label:"Create invitation"}],
};

const privateRoute = (path:string) => (path.startsWith("/account/") && path!=="/account/help") || path.startsWith("/admin/") || path.startsWith("/operations/") || path.startsWith("/field-agent/");
const blockedInfo = "This screen is informational until its specific backend policy and authorization flow are enabled. No sensitive operation has occurred.";

export function AuthExperience({route,previewEnabled,authenticated=false}:{route:string;previewEnabled:boolean;authenticated?:boolean}){
 const scenarios = useMemo(()=>states.filter(s=>s.route.split("?")[0]===route),[route]);
 const [selected,setSelected]=useState<string|undefined>();
 useEffect(()=>{if(previewEnabled){const requested=new URLSearchParams(window.location.search).get("preview");if(requested&&scenarios.some(s=>s.id===requested))setSelected(requested);}},[previewEnabled,scenarios]);
 const screen:AuthState|undefined = scenarios.find(s=>s.id===selected)??scenarios[0];
 const transition=transitions.find(t=>t.id===screen?.id);
 const titleInfo = headline[route] ?? {eyebrow:scenarios[0]?.module??"Account journey",title:route.split("/").filter(Boolean).at(-1)?.replaceAll("-"," ")??"Account access",description:"This account lifecycle step needs authenticated, server-authorized state before it can change records."};
 const reviewPaths = related[route] ?? [{href:"/account/help",label:"Account help"},{href:"/login",label:"Sign in"}];
 const locked=(privateRoute(route)&&!authenticated || ["/invite/complete","/account/delete/complete"].includes(route))&&!previewEnabled;
 return <div className="auth-layout">
  <aside className="auth-aside">
   <Link href="/" className="auth-logo">SmartHub<span>AgroChain</span></Link>
   <div className="auth-aside-main"><p className="auth-aside-kicker">Where agriculture meets innovation</p><h2>One trusted connection.<br/><em>Many possibilities.</em></h2><p>Secure accounts for farmers, buyers and the teams coordinating verified agricultural supply.</p><div className="auth-step-list"><span>01 <b>Identity</b></span><span>02 <b>Verification</b></span><span>03 <b>Authorized access</b></span></div></div>
   <div className="auth-aside-bottom">SMART AGRICULTURE · NIGERIA FIRST</div>
  </aside>
  <main className="auth-main" id="main"><div className="auth-topline"><Link href="/" className="auth-back">← Back to website</Link><span className="auth-environment">{previewEnabled?"DESIGN REVIEW / NOT CONNECTED":"ACCOUNT SERVICES NOT ENABLED"}</span></div>
   <section className="auth-content" aria-labelledby="auth-heading"><div className="auth-heading"><p className="auth-kicker">{titleInfo.eyebrow}</p><h1 id="auth-heading">{titleInfo.title}</h1><p>{titleInfo.description}</p></div>
    {locked ? <><ActionNotice kind="error">This account or staff area requires real authenticated authorization. It cannot be accessed as a public preview in production.</ActionNotice><Link className="auth-submit auth-cta-link" href="/login">Return to sign in →</Link></>:
    <><div className="auth-card">
       {screen&&<div className="auth-state-intro"><span className="auth-state-dot"/><div><span className="auth-state-tag">{screen.module}</span><h2>{screen.name}</h2><p>{screen.action}</p></div></div>}
       <FormForRoute route={route} previewStateId={previewEnabled?screen?.id:undefined}/>
       {screen&&<GenericAction route={route} action={screen.action} stateId={screen.id}/>}
       {!(["/signup","/login","/forgot-password","/reset-password","/account/security/password","/verify-phone","/account/security/phone","/account/security/email","/admin/staff/invite","/admin/staff/new","/account/profile","/operations/account","/field-agent/account","/admin/account","/account/delete","/account/delete/confirm","/account/preferences","/invite/accept","/invite/profile"].includes(route))&& <ActionNotice kind="info">{blockedInfo} This screen displays the documented guidance and recovery options without claiming the operation succeeded.</ActionNotice>}
       {route==="/account/help"&&<p className="auth-support">Need additional assistance? <a href="mailto:info@smarthubagrochain.online">Email SmartHub support</a>.</p>}
       <div className="auth-route-links">{reviewPaths.filter(x=>safeInternalPath(x.href)).map(x=><Link key={x.href} href={x.href}>{x.label} ↗</Link>)}</div>
     </div>
     {previewEnabled && <div className="auth-preview" aria-label="Development state explorer"><details><summary>Developer state explorer <span>{scenarios.length} states · {screen?.id}</span></summary><div className="auth-preview-inner"><ActionNotice kind="warning">Development-only preview: selecting a state only changes this visual example. It cannot authenticate, verify, activate or modify an account.</ActionNotice><div className="auth-preview-grid">{scenarios.map(s=><button type="button" onClick={()=>{setSelected(s.id);const url=new URL(window.location.href);url.searchParams.set("preview",s.id);history.replaceState(null,"",url.pathname+url.search);}} aria-pressed={screen?.id===s.id} className={screen?.id===s.id?"auth-preview-choice selected":"auth-preview-choice"} key={s.id}><span>{s.id}</span>{s.name}</button>)}</div><dl className="auth-contract"><dt>Expected action</dt><dd>{screen?.action}</dd><dt>Backend gate</dt><dd>{screen?.gate}</dd><dt>Expected next destination</dt><dd>{transition?.next||"Not specified"}</dd><dt>Error recovery</dt><dd>{transition?.error||"Not specified"}</dd><dt>Requirement basis</dt><dd>{screen?.basis||"Design proposal"}</dd><dt>Test</dt><dd>{screen?.test}</dd></dl><Link className="auth-preview-all" href="/auth-preview">View full 144-state registry →</Link></div></details></div>}
    </>}
    <p className="auth-footer">Protected by design · <Link href="/privacy">Privacy notice</Link> · <Link href="/terms">Terms</Link> · <Link href="/account/help">Support</Link></p>
   </section></main>
 </div>;
}
