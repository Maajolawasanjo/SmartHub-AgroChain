import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){const {account}=await requireBuyerPage();return <DashboardFrame role="BUYER" name={account.fullName} title="Orders & Fulfilment" description="Your managed procurement workspace."><WorkspaceUnavailable title="Orders & Fulfilment" description="Orders and fulfilment records will appear after the quotation, verified payment and order modules are implemented. No example orders are shown." home="/dashboard"/></DashboardFrame>}
