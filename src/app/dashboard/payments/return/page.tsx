import Link from "next/link";
import {DashboardFrame} from "@/components/dashboard/dashboard-frame";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function PaystackReturn(){
 const {account}=await requireBuyerPage();
 return <DashboardFrame role="BUYER" name={account.fullName} title="Returned from secure checkout" description="Confirm your payment only from SmartHub's recorded provider verification.">
 <section className="buyer-panel"><h2>Checkout return received</h2>
 <p>This return page does not mean Paystack collected or verified any payment. Your order status will change only after SmartHub's server independently verifies the Paystack transaction against its payment obligation.</p>
 <p>Open your recorded payment attempt and use Check Paystack status securely if it remains pending.</p>
 <Link className="action action-primary" href="/dashboard/payments">Review verified payment status</Link></section>
 </DashboardFrame>;
}
