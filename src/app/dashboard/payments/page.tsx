import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){const {account}=await requireBuyerPage();return <DashboardFrame role="BUYER" name={account.fullName} title="Payments & Transactions" description="Your managed procurement workspace."><WorkspaceUnavailable title="Payments & Transactions" description="Payment obligations, receipts and verified transactions will appear only when the trusted payment module is implemented. This is not a stored-value wallet." home="/dashboard"/></DashboardFrame>}
