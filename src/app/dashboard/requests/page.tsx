import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){const {account}=await requireBuyerPage();return <DashboardFrame role="BUYER" name={account.fullName} title="My Requests & Quotes" description="Your managed procurement workspace."><WorkspaceUnavailable title="My Requests & Quotes" description="Sourcing requests, review updates and official quotations will become available in Phase 09 and Phase 10. Saved specifications are not submitted requests." home="/dashboard"/></DashboardFrame>}
