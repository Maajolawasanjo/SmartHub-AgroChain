import { PortalShell } from "@/components/portal/portal-shell";
export const dynamic="force-dynamic";
export default async function Page(){return <PortalShell route="/farmer" title="Farmer Portal" description="Your farm, crops and verified supply will appear here after farmer onboarding is connected."/>;}
