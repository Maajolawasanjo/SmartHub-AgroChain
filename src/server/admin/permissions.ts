import type { AccountRole } from "@/generated/prisma/client";

export const STAFF_ROLES = ["FIELD_AGENT", "OPERATIONS"] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export function isStaffRole(role: AccountRole | string): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

export const PERMISSIONS = [
  "buyer.request.create",
  "farmer.supply.manage",
  "field.assigned.read",
  "field.visit.manage",
  "field.evidence.submit",
  "operations.verification.review",
  "operations.supply.review",
  "operations.catalog.manage",
  "operations.enquiries.manage",
  "operations.requests.review",
  "staff.invite",
  "staff.manage",
  "staff.assign",
  "staff.audit.read",
  "permissions.view",
  "platform.reports.read",
  "platform.governance.manage",
] as const;
export type Permission = typeof PERMISSIONS[number];

const ROLE_PERMISSIONS: Record<AccountRole, readonly Permission[]> = {
  BUYER: ["buyer.request.create"],
  FARMER: ["farmer.supply.manage"],
  FIELD_AGENT: ["field.assigned.read", "field.visit.manage", "field.evidence.submit"],
  OPERATIONS: ["operations.verification.review", "operations.supply.review", "operations.catalog.manage", "operations.enquiries.manage", "operations.requests.review"],
  SUPER_ADMIN: ["operations.verification.review", "operations.supply.review", "operations.catalog.manage", "operations.enquiries.manage", "operations.requests.review", "staff.invite", "staff.manage", "staff.assign", "staff.audit.read", "permissions.view", "platform.reports.read", "platform.governance.manage"],
};

export const PERMISSION_DETAILS: ReadonlyArray<{permission:Permission;label:string;description:string}> = [
  {permission:"buyer.request.create",label:"Create sourcing requests",description:"Submit procurement requests as a buyer."},
  {permission:"farmer.supply.manage",label:"Manage own supply",description:"Maintain the farmer's own crop and supply declarations."},
  {permission:"field.assigned.read",label:"View assigned field work",description:"Read only farmers and field records within assigned scopes."},
  {permission:"field.visit.manage",label:"Manage own field visits",description:"Create, update, submit and cancel own field visits within active state scopes."},
  {permission:"field.evidence.submit",label:"Submit field evidence",description:"Submit inspection notes and evidence for assigned work."},
  {permission:"operations.verification.review",label:"Review farmer verification",description:"Review and decide farmer verification cases."},
  {permission:"operations.supply.review",label:"Review supply declarations",description:"Review supply declarations and evidence."},
  {permission:"operations.catalog.manage",label:"Manage public catalog",description:"Prepare catalog metadata and publication requests."},
  {permission:"operations.enquiries.manage",label:"Manage public enquiries",description:"Review and close public contact enquiries."},
  {permission:"operations.requests.review",label:"Review buyer sourcing requests",description:"Claim, clarify, assess and close buyer demand requests."},
  {permission:"staff.invite",label:"Invite staff",description:"Issue invitations for approved staff roles."},
  {permission:"staff.manage",label:"Manage staff identity",description:"Change staff roles and active/suspended status."},
  {permission:"staff.assign",label:"Manage field scopes",description:"Assign or remove Field Agent state scopes."},
  {permission:"staff.audit.read",label:"Read staff audit history",description:"Review auditable staff and access changes."},
  {permission:"permissions.view",label:"View permission templates",description:"Inspect fixed role-based permissions; no custom grants."},
  {permission:"platform.reports.read",label:"Platform reporting",description:"Read organization-wide operational and provider-verified finance summaries and export aggregate CSV."},
  {permission:"platform.governance.manage",label:"Governance incidents",description:"Create and transition reason-coded incident investigations without modifying source transactions or roles."},
];

export function hasPermission(role:AccountRole, permission:Permission):boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
export function permissionsForRole(role:AccountRole):readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
