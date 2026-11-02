import { PortalShell } from "@/components/portal/portal-shell";
export const dynamic="force-dynamic";
export default async function Page(){return <PortalShell route="/admin" title="Super Admin Portal" description="Staff permissions, governance and auditing require the approved administration module."/>;}
