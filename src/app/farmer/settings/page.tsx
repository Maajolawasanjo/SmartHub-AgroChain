import {PortalFrame,FeatureNotReady,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function Page(){const {account}=await requirePortal("FARMER");return <PortalFrame name={account.fullName} role="FARMER" route="/farmer/settings" title="Settings" subtitle="This module depends on real downstream business records."><FeatureNotReady name="Settings"/></PortalFrame>}
