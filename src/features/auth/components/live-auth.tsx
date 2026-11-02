"use client";
import Link from "next/link";
import { useEffect,useState,type FormEvent } from "react";
import { NIGERIA_STATES,normalizeNigeriaPhone,validateSignup,type PublicRole,type SignupData } from "../auth-rules";
import { ActionNotice,Field,Submit } from "./auth-ui";

type Result={ok?:boolean;next?:string;message?:string;error?:string;account?:Record<string,string|boolean|null>};
const serviceNames:Record<string,string>={
 "/signup":"Create your SmartHub account", "/login":"Welcome back", "/forgot-password":"Recover your password",
 "/verify-email":"Verify your email address", "/verify-phone":"Verify your farmer phone number",
 "/reset-password":"Choose a new password", "/logout":"Secure sign out",
 "/account/profile":"Your personal profile", "/account/security/password":"Change your password",
 "/account/security/email":"Change your email", "/account/security/phone":"Change your phone number",
 "/account/delete":"Request account deletion", "/account/delete/confirm":"Confirm account deletion request",
 "/admin/staff/invite":"Invite a staff member", "/admin/staff/new":"Invite a staff member",
 "/invite/accept":"Accept your staff invitation",
};
async function post(path:string,data:Record<string,unknown>):Promise<Result>{
 const response=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),cache:"no-store"});
 const json=await response.json() as Result;
 if(!response.ok)throw new Error(json.error||"An error occurred. Please try again.");
 return json;
}
function useApi(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>,path:string,data:Record<string,unknown>){
  e.preventDefault();if(busy)return;
  setBusy(true);setError("");setInfo("");
  try{
   const result=await post(path,data);
   if(result.message)setInfo(result.message);
   if(result.next?.startsWith("/")&&!result.next.startsWith("//"))window.location.assign(result.next);
  }catch(e){setError(e instanceof Error?e.message:"Request failed.");}
  finally{setBusy(false);}
 }
 return {busy,error,info,submit};
}
function Feedback({api}:{api:ReturnType<typeof useApi>}){
 return <>{api.error&&<ActionNotice kind="error">{api.error}</ActionNotice>}{api.info&&<ActionNotice kind="info">{api.info}</ActionNotice>}</>;
}
function Signup(){
 const [role,setRole]=useState<PublicRole>("buyer");
 const [data,setData]=useState<Omit<SignupData,"role">>({fullName:"",farmName:"",state:"",email:"",phone:"",password:"",confirmPassword:"",agree:false});
 const api=useApi();
 useEffect(()=>{const r=new URLSearchParams(window.location.search).get("role");if(r==="buyer"||r==="farmer")setRole(r);},[]);
 const [errors,setErrors]=useState<Record<string,string>>({});
 function change<K extends keyof typeof data>(field:K,value:(typeof data)[K]){setData(v=>({...v,[field]:value}));setErrors({});}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const candidate={...data,role};const found=validateSignup(candidate);
  if(Object.keys(found).length){setErrors(found);return;}
  await api.submit(e,"/api/auth/signup",candidate);
 }
 return <><div className="auth-tabs" role="group" aria-label="Account type">
 {(["buyer","farmer"] as const).map(r=><button type="button" key={r} className={role===r?"auth-tab active":"auth-tab"} aria-pressed={role===r} onClick={()=>setRole(r)}>{r==="farmer"?"Farmer":"Buyer"}</button>)}
 </div><p className="auth-hint">{role==="farmer"?"Farmers verify their email and phone once before full dashboard access.":"Buyers verify their email; phone verification is not required during signup."}</p>
 <form className="auth-form" noValidate onSubmit={submit}>
 <Field id="signup-fullname" label="Full name" required autoComplete="name" value={data.fullName} onChange={e=>change("fullName",e.target.value)} error={errors.fullName}/>
 {role==="farmer"&&<><Field id="signup-farm" label="Farm name" required value={data.farmName} onChange={e=>change("farmName",e.target.value)} error={errors.farmName}/><label className="auth-label" htmlFor="signup-state">State / FCT</label><select id="signup-state" required className="auth-input" value={data.state} onChange={e=>change("state",e.target.value)}><option value="">Select state</option>{NIGERIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select>{errors.state&&<p role="alert" className="auth-field-error">{errors.state}</p>}</>}
 <Field id="signup-email" label="Email address" type="email" autoComplete="email" required value={data.email} onChange={e=>change("email",e.target.value)} error={errors.email}/>
 <Field id="signup-phone" label="Nigerian phone number" type="tel" autoComplete="tel" required value={data.phone} onChange={e=>change("phone",e.target.value)} error={errors.phone} hint={normalizeNigeriaPhone(data.phone)||"Use a valid 080…, 070… or +234… number"}/>
 <Field id="signup-pass" label="Password" type="password" autoComplete="new-password" required value={data.password} onChange={e=>change("password",e.target.value)} error={errors.password}/>
 <Field id="signup-confirm" label="Confirm password" type="password" autoComplete="new-password" required value={data.confirmPassword} onChange={e=>change("confirmPassword",e.target.value)} error={errors.confirmPassword}/>
 <label className="auth-check"><input type="checkbox" checked={data.agree} onChange={e=>change("agree",e.target.checked)}/><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Notice</Link>.</span></label>{errors.agree&&<p role="alert" className="auth-field-error">{errors.agree}</p>}
 <button className="auth-submit" type="submit" disabled={api.busy}>{api.busy?"Creating account…":"Create account"}</button><Feedback api={api}/>
 </form><p className="auth-support">Already registered? <Link href="/login">Sign in</Link></p></>;
}
function Login(){const[email,setEmail]=useState(""),[password,setPassword]=useState("");const api=useApi();
 return <><form className="auth-form" onSubmit={e=>api.submit(e,"/api/auth/login",{email,password})}><Field id="login-email" label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><Field id="login-password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><p className="auth-inline-link"><Link href="/forgot-password">Forgot password?</Link></p><button className="auth-submit" type="submit" disabled={api.busy}>{api.busy?"Signing in…":"Sign in"}</button><Feedback api={api}/></form><p className="auth-support">New here? <Link href="/signup">Join as Buyer or Farmer</Link></p><ActionNotice kind="info">Your portal is selected from your trusted account role, not a login-screen selection.</ActionNotice></>;
}
function EmailRecover({resend=false}:{resend?:boolean}){const[email,setEmail]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,`/api/auth/${resend?"resend-email":"forgot"}`,{email})}><Field id="email-action" label="Email address" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><button type="submit" disabled={api.busy} className="auth-submit">{api.busy?"Submitting…":resend?"Resend confirmation email":"Send password recovery link"}</button><Feedback api={api}/><p className="auth-support"><Link href="/login">Return to sign in</Link></p></form>}
function Password({change=false}:{change?:boolean}){const[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[currentPassword,setCurrentPassword]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,change?"/api/account/password":"/api/auth/reset-password",{currentPassword,password,confirmPassword})}>{change&&<Field id="current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/>}<Field id="new-password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/><Field id="new-confirm" label="Confirm new password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/><button type="submit" className="auth-submit" disabled={api.busy}>{api.busy?"Saving…":change?"Change password":"Reset password"}</button><Feedback api={api}/></form>}
function PhoneVerify(){const[token,setToken]=useState("");const send=useApi(),verify=useApi();return <><ActionNotice kind="info">Your phone must receive a real SMS from your configured Supabase SMS provider. Verification is checked on the server.</ActionNotice><form className="auth-form" onSubmit={e=>send.submit(e,"/api/auth/start-phone",{})}><button type="submit" className="auth-submit auth-secondary-submit" disabled={send.busy}>{send.busy?"Requesting SMS…":"Send or resend SMS code"}</button><Feedback api={send}/></form><form className="auth-form" onSubmit={e=>verify.submit(e,"/api/auth/verify-phone",{token})}><Field id="phone-otp" label="Six-digit SMS code" inputMode="numeric" autoComplete="one-time-code" required value={token} onChange={e=>setToken(e.target.value)}/><button type="submit" className="auth-submit" disabled={verify.busy||!/^[0-9]{6}$/.test(token)}>{verify.busy?"Verifying…":"Verify phone"}</button><Feedback api={verify}/></form></>}
function Profile(){const[name,setName]=useState(""),[details,setDetails]=useState<Record<string,string|boolean|null>|null>(null);const api=useApi();
 useEffect(()=>{post("/api/auth/me",{}).then(v=>{if(v.account){setDetails(v.account);setName(String(v.account.fullName||""));}}).catch(()=>{});},[]);
 return <><ActionNotice kind="info">Only your permitted personal details are editable. Staff roles and verification cannot be changed here.</ActionNotice>{details&&<p className="auth-hint">{String(details.email)} · {String(details.role)}</p>}<form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/profile",{fullName:name})}><Field id="profile-name" label="Full name" required value={name} onChange={e=>setName(e.target.value)}/><button className="auth-submit" disabled={api.busy} type="submit">{api.busy?"Saving…":"Save profile"}</button><Feedback api={api}/></form></>}
function ChangeEmail(){const[email,setEmail]=useState(""),[currentPassword,setCurrentPassword]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/email",{email,currentPassword})}><Field id="new-email" label="New email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><Field id="email-current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><ActionNotice kind="info">Your existing email remains active until confirmation succeeds.</ActionNotice><button className="auth-submit" type="submit" disabled={api.busy}>Request email change</button><Feedback api={api}/></form>}
function ChangePhone(){const[phone,setPhone]=useState(""),[currentPassword,setCurrentPassword]=useState("");const api=useApi();return <><form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/phone",{phone,currentPassword})}><Field id="new-contact-number" label="New Nigerian mobile number" type="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)}/><Field id="phone-current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/><ActionNotice kind="info">Your existing number remains active until the replacement is confirmed by SMS.</ActionNotice><button className="auth-submit" type="submit" disabled={api.busy}>Request phone change</button><Feedback api={api}/></form><div className="mt-6"><PhoneVerify/></div></>}

function Invite(){const[email,setEmail]=useState(""),[role,setRole]=useState("FIELD_AGENT");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/admin/staff/invite",{email,role})}><Field id="invite-email" label="Staff email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label className="auth-label" htmlFor="invite-role">Assigned role</label><select id="invite-role" className="auth-input" value={role} onChange={e=>setRole(e.target.value)}><option value="FIELD_AGENT">Field Agent</option><option value="OPERATIONS">Operations</option></select><button className="auth-submit" type="submit" disabled={api.busy}>Send secure invitation</button><Feedback api={api}/></form>}
function AcceptInvite(){const[fullName,setName]=useState(""),[password,setPassword]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/auth/accept-invite",{fullName,password})}><ActionNotice kind="info">Only an authenticated, invited staff member can activate a staff account.</ActionNotice><Field id="invite-name" label="Your full name" required value={fullName} onChange={e=>setName(e.target.value)}/><Field id="invite-password" label="Set your password" type="password" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="auth-submit" type="submit" disabled={api.busy}>Accept invitation and activate</button><Feedback api={api}/></form>}
function DeleteRequest(){const[confirmation,setConfirmation]=useState(""),[password,setPassword]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/delete-request",{confirmation,password})}><ActionNotice kind="info">This submits a review request. It does NOT delete your account immediately; lawful records and ongoing transactions need review.</ActionNotice><Field id="confirm-delete" label="Type DELETE to continue" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><Field id="delete-password" label="Confirm your password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="auth-submit" type="submit" disabled={api.busy||confirmation!=="DELETE"}>Request account deletion review</button><Feedback api={api}/></form>}
function Sessions(){const[currentPassword,setPassword]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/revoke-others",{currentPassword})}>
 <ActionNotice kind="info">Revoke other sign-in refresh sessions. SmartHub does not yet have a verified device-session inventory. Existing access tokens may remain active until they expire.</ActionNotice>
 <Field id="sessions-current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setPassword(e.target.value)}/>
 <button className="auth-submit" type="submit" disabled={api.busy}>{api.busy?"Revoking…":"Sign out other devices"}</button><Feedback api={api}/>
 <p className="auth-support"><Link href="/account/security">Back to security</Link></p>
 </form>}
function CancelDeletion(){const[confirmation,setConfirmation]=useState("");const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/account/delete-cancel",{confirmation})}>
 <ActionNotice kind="info">You can cancel a deletion request while it is still awaiting review. Requests already under review require support assistance.</ActionNotice>
 <Field id="cancel-deletion-confirmation" label="Type CANCEL to keep your account" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/>
 <button className="auth-submit" type="submit" disabled={api.busy||confirmation!=="CANCEL"}>{api.busy?"Cancelling…":"Cancel pending deletion request"}</button><Feedback api={api}/>
 </form>}
function Logout(){const api=useApi();return <form className="auth-form" onSubmit={e=>api.submit(e,"/api/auth/logout",{})}><p>Your active SmartHub browser session will be ended.</p><button className="auth-submit" type="submit" disabled={api.busy}>Sign out securely</button><Feedback api={api}/></form>}

export function LiveAuth({route}:{route:string}){
 const title=serviceNames[route]||"SmartHub account";
 const form=(()=>{switch(route){
 case "/signup":return <Signup/>;case "/login":return <Login/>;case "/forgot-password":return <EmailRecover/>;
 case "/verify-email":return <EmailRecover resend/>;case "/verify-phone":return <PhoneVerify/>;
 case "/reset-password":return <Password/>;case "/account/security/password":return <Password change/>;
 case "/account/profile":case "/operations/account":case "/field-agent/account":case "/admin/account":return <Profile/>;
 case "/account/security/email":return <ChangeEmail/>;case "/account/security/phone":return <ChangePhone/>;
 case "/admin/staff/invite":case "/admin/staff/new":return <Invite/>;case "/invite/accept":case "/invite/profile":return <AcceptInvite/>;
 case "/account/delete":case "/account/delete/confirm":return <DeleteRequest/>;case "/account/delete/cancel":return <CancelDeletion/>;case "/account/sessions":return <Sessions/>;case "/logout":return <Logout/>;
 default:return <ActionNotice kind="info">This part of the account lifecycle is waiting for its approved backend policy. No action has been completed.</ActionNotice>;
 }})();
 return <div className="auth-layout"><aside className="auth-aside"><Link href="/" className="auth-logo">SmartHub<span>AgroChain</span></Link><div className="auth-aside-main"><p className="auth-aside-kicker">Where agriculture meets innovation</p><h2>Secure identity.<br/><em>Connected journeys.</em></h2><p>Access for Nigerian farmers, agricultural buyers, and authorized SmartHub teams.</p></div><div className="auth-aside-bottom">ACCOUNT & SECURITY</div></aside>
 <main className="auth-main"><div className="auth-topline"><Link href="/" className="auth-back">← Back to website</Link><span className="auth-environment">SECURE SMART HUB</span></div><section className="auth-content"><div className="auth-heading"><p className="auth-kicker">Account services</p><h1>{title}</h1></div><div className="auth-card">{form}<div className="auth-route-links"><Link href="/account/help">Account help</Link><Link href="/login">Sign in</Link></div></div><p className="auth-footer"><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p></section></main></div>;
}
