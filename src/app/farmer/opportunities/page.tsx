import {PortalFrame,FeatureNotReady,requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function Page(){const {account}=await requirePortal("FARMER");return <PortalFrame name={account.fullName} role="FARMER" route="/farmer/opportunities" title="Opportunities" subtitle="This module depends on real downstream business records."><FeatureNotReady name="Opportunities"/></PortalFrame>}
