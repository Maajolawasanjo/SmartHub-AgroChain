/**
 * R01.2 approved-source role and action vocabulary. PRESENTATION/PLANNING ONLY.
 *
 * These proposed role templates and capability areas are NOT auth roles, grants,
 * claims, permission defaults, invitations or implementation-time access decisions.
 * Production enforcement remains in src/server/admin/permissions.ts and guard.ts.
 *
 * Source documents:
 * - Admin Dashboard Web Implementation, section 5 (User Roles, Staff Access and Permissions).
 * - Admin Dashboard Master Requirements Register, Groups 1-12 and Team & Access.
 * The source's detailed individual-permission and cross-module addenda still govern
 * behavior when those modules are implemented; this catalogue cannot replace them.
 */

export const TARGET_ADMIN_ROLE_TEMPLATES = [
 {id:"super-admin",title:"Super Admin",current:"SUPER_ADMIN",scope:"Platform governance and administrative oversight",state:"PARTIAL"},
 {id:"operations-officer",title:"Operations Officer",current:"OPERATIONS",scope:"Operational coordination and review",state:"PARTIAL"},
 {id:"field-agent",title:"Field Agent",current:"FIELD_AGENT",scope:"Authorized assignments, visits and field evidence",state:"PARTIAL"},
 {id:"sourcing-officer",title:"Sourcing Officer",current:null,scope:"Buyer demand, supply matching and quotation preparation",state:"NOT_IMPLEMENTED"},
 {id:"fulfilment-logistics-officer",title:"Fulfilment / Logistics Officer",current:null,scope:"Orders, logistics, dispatch and delivery records",state:"NOT_IMPLEMENTED"},
 {id:"finance-officer",title:"Finance Officer",current:null,scope:"Authorized finance records, reconciliation and supplier payables",state:"NOT_IMPLEMENTED"},
 {id:"support-communications-officer",title:"Support / Communications Officer",current:null,scope:"Support cases, inquiries and communications",state:"NOT_IMPLEMENTED"},
 {id:"content-editor",title:"Content Editor",current:null,scope:"Approved public content, articles and media",state:"NOT_IMPLEMENTED"}
] as const;

export const TARGET_ADMIN_ACTIONS = [
 {id:"view",label:"View",meaning:"Read an authorized resource"},
 {id:"create",label:"Create",meaning:"Create a resource within authorized scope"},
 {id:"edit",label:"Edit",meaning:"Change an authorized existing resource"},
 {id:"approve",label:"Approve",meaning:"Take an independently authorized approval decision"},
 {id:"delete",label:"Delete",meaning:"Remove or disable an authorized resource under applicable retention rules"},
 {id:"export",label:"Export",meaning:"Export data only within approved record and confidentiality scope"},
 {id:"manage",label:"Manage",meaning:"Carry out other expressly authorized administration actions"}
] as const;

export const TARGET_ADMIN_MODULE_GROUPS = [
 {id:"overview",label:"Overview",owner:"General Admin Overview and Admin Overview",state:"NOT_ACCEPTED"},
 {id:"farmers-buyers",label:"Farmers & Buyers",owner:"Farmer, buyer, verification and account-status records",state:"NOT_ACCEPTED"},
 {id:"field-operations",label:"Field Operations",owner:"Assignments, visits, inspection, field reports and evidence",state:"NOT_ACCEPTED"},
 {id:"products-supply",label:"Products & Supply",owner:"Supply inventory, catalogue, verification, availability and commodities",state:"NOT_ACCEPTED"},
 {id:"sourcing-quotes",label:"Sourcing & Quotes",owner:"Buyer requests, matching, quotations, negotiations and approvals",state:"NOT_ACCEPTED"},
 {id:"orders-fulfilment",label:"Orders & Fulfilment",owner:"Orders, preparation, logistics, delivery evidence and buyer acceptance",state:"NOT_ACCEPTED"},
 {id:"finance",label:"Finance",owner:"Payment records, reconciliation, payables, transaction costs, refunds and reports",state:"NOT_ACCEPTED"},
 {id:"support-disputes",label:"Support & Disputes",owner:"Inquiries, requests, complaints and commercial disputes",state:"NOT_ACCEPTED"},
 {id:"content-communications",label:"Content & Communications",owner:"Articles, insights, announcements, website content and media",state:"NOT_ACCEPTED"},
 {id:"reports-audit",label:"Reports & Audit",owner:"Operational, transaction, staff reporting and authoritative audit trail",state:"NOT_ACCEPTED"},
 {id:"team-access",label:"Team & Access",owner:"Staff directory, invitations, role templates and individual permissions",state:"NOT_ACCEPTED"},
 {id:"system-settings",label:"System Settings",owner:"Platform configuration, fees, verification, rates, payments and security",state:"NOT_ACCEPTED"}
] as const;

export const ADMIN_ACCESS_MISSING_CONTROLS = [
 {id:"individual-overrides",label:"Individual permission grants and restrictions",gate:"R00-D04"},
 {id:"central-effective-permissions",label:"Central server-side effective-permission evaluator and record scope",gate:"R00-D04"},
 {id:"privileged-mfa",label:"Verified MFA for privileged actions and accounts",gate:"R00-D04"},
 {id:"two-super-admins",label:"Two designated Super Admin accounts and controlled recovery",gate:"R00-D04"},
 {id:"finance-segregation",label:"Independent finance authority separate from Super Admin identity",gate:"R00-D09"},
 {id:"architecture",label:"New Admin project and authoritative service integration decision",gate:"R00-D01"}
] as const;

/**
 * This object MUST NOT be used to authorize a request.
 * In particular it deliberately contains no role-to-permission mapping.
 */
export const TARGET_ADMIN_BLUEPRINT = {
 kind:"NON_EXECUTABLE_REQUIREMENTS_CATALOGUE",
 implementedGrants:false,
 effectivePermissionsAvailable:false,
 source:"Client Admin Dashboard Web Implementation & Master Requirements Register",
 roles:TARGET_ADMIN_ROLE_TEMPLATES,
 actions:TARGET_ADMIN_ACTIONS,
 moduleGroups:TARGET_ADMIN_MODULE_GROUPS,
 missingControls:ADMIN_ACCESS_MISSING_CONTROLS
} as const;
