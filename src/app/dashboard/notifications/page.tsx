import {redirect} from "next/navigation";
import {requireBuyerPage} from "@/server/buyer/guard";
export const dynamic="force-dynamic";
export default async function BuyerRequestUpdates(){await requireBuyerPage();redirect("/inbox");}
