import Link from "next/link";
import {PortalFrame,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function FarmerSettings(){
 const {account}=await requirePortal("FARMER");
 return <PortalFrame name={account.fullName} role="FARMER" route="/farmer/settings" title="Settings" subtitle="Manage your regional preferences, notifications, and account security.">
  <section className="agro-panel"><h2>Regional & Localization Preferences</h2><p>Country: Nigeria</p><p>Timezone: Africa/Lagos</p><p>Default locale: English (Nigeria)</p><p className="agro-hint">These are the platform's current display defaults, not editable saved preferences. Currency conversion is not configured; no conversion rates are inferred.</p></section>
  <section className="agro-panel"><h2>Notification Preferences</h2><p>Per-category delivery preferences are not available until the notification delivery service is implemented.</p><p className="agro-hint">We will not claim email, SMS or WhatsApp notifications are enabled without a verified delivery integration.</p></section>
  <section className="agro-panel"><h2>Login & Security</h2><p>Registered email: {account.email}</p><p>Registered phone: {account.phone}</p><p className="agro-hint">Sensitive contact and password changes must use verified authentication flows.</p><Link className="action action-outline" href="/account/security">Account security</Link></section>
  <section className="agro-panel"><h2>Account Access & Support</h2><div className="agro-toolbar"><Link className="action action-outline" href="/farmer/kyc">Farm profile & verification</Link><Link className="action action-outline" href="/contact">Contact SmartHub</Link><Link className="action action-outline" href="/privacy">Privacy policy</Link><Link className="action action-outline" href="/terms">Terms of service</Link></div></section>
 </PortalFrame>;
}
