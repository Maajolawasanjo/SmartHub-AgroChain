import {redirect} from "next/navigation";
import {requirePortal} from "@/components/agriculture/portal-frame";
export const dynamic="force-dynamic";
export default async function Page(){await requirePortal("FARMER");redirect("/inbox");}
