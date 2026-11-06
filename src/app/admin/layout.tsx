import type {ReactNode} from "react";
import {requireSuperAdminPage} from "@/server/admin/guard";

export const dynamic="force-dynamic";

/**
 * R01 defense in depth: every /admin page, including future nested routes,
 * must pass the active, email-verified, server-derived Super Admin guard.
 * This layout is NOT a replacement for individual page, API and record-level checks.
 * Existing financial approval policies are unchanged pending client decisions.
 */
export default async function AdminLayout({children}:{children:ReactNode}){
 await requireSuperAdminPage();
 return <>{children}</>;
}
