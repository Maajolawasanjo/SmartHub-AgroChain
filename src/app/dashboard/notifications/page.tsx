import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {WorkspaceUnavailable} from "@/components/dashboard/dashboard-ui";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function Page(){const {account}=await requireBuyerPage();return <DashboardFrame role="BUYER" name={account.fullName} title="Notifications" description="Your managed procurement workspace."><WorkspaceUnavailable title="Notifications" description="Business notifications will appear when an authorized event-driven notification service is implemented. No unread count is invented." home="/dashboard"/></DashboardFrame>}
