/** Safe presentation metadata only. Authorization always comes from server account records. */
export type WorkspaceRole = "BUYER" | "FARMER" | "FIELD_AGENT" | "OPERATIONS" | "SUPER_ADMIN";
export type NavigationItem = { label: string; href: string; icon: IconName; availability: "active" | "planned" };
export type IconName = "grid" | "leaf" | "box" | "receipt" | "clock" | "users" | "shield" | "settings" | "bell" | "map" | "check" | "clipboard" | "search" | "truck" | "wallet" | "chart" | "file" | "help" | "user" | "lock" | "tag" | "calendar" | "mail";
export type NavigationSection = { title: string; items: NavigationItem[] };
const active=(label:string,href:string,icon:IconName):NavigationItem=>({label,href,icon,availability:"active"});
const planned=(label:string,href:string,icon:IconName):NavigationItem=>({label,href,icon,availability:"planned"});

export const workspaceMeta:Record<WorkspaceRole,{title:string;home:string;description:string}>={
 BUYER:{title:"Buyer Workspace",home:"/dashboard",description:"Manage your agricultural procurement"},
 FARMER:{title:"Farmer Workspace",home:"/farmer",description:"Grow, declare and manage agricultural supply"},
 FIELD_AGENT:{title:"Field Agent Workspace",home:"/field-agent",description:"Coordinate assigned field verification"},
 OPERATIONS:{title:"Operations Workspace",home:"/operations",description:"Coordinate verification and supply review"},
 SUPER_ADMIN:{title:"Platform Administration",home:"/admin",description:"Govern access and platform operations"},
};

/** A planned item is visible but never navigates to a nonexistent or incomplete feature. */
export const workspaceNavigation:Record<WorkspaceRole,NavigationSection[]>={
 BUYER:[
  {title:"Procurement",items:[active("Overview","/dashboard","grid"),planned("Products & Supply","/dashboard/products","leaf"),planned("Requests & Quotes","/dashboard/requests","clipboard"),planned("Orders & Fulfilment","/dashboard/orders","box"),planned("Payments & Transactions","/dashboard/payments","receipt")]},
  {title:"My business",items:[planned("Business Profile & Settings","/dashboard/settings","settings")]},
 ],
 FARMER:[
  {title:"Farm management",items:[active("Overview","/farmer","grid"),active("My Supply","/farmer/my-supply","leaf"),planned("Opportunities","/farmer/opportunities","search"),planned("Orders & Transactions","/farmer/orders","box"),planned("Payments & Settlements","/farmer/wallet","wallet")]},
  {title:"My account",items:[planned("Notifications","/farmer/notifications","bell"),active("Farm Profile & Verification","/farmer/kyc","check"),planned("Farmer Settings","/farmer/settings","settings")]},
 ],
 FIELD_AGENT:[
  {title:"Field operations",items:[active("Overview","/field-agent","grid"),planned("Assigned Farmers","/field-agent/farmers","users"),planned("Field Visits","/field-agent/visits","calendar"),planned("Inspections & Evidence","/field-agent/inspections","clipboard"),planned("Submitted Reports","/field-agent/reports","file")]},
 ],
 OPERATIONS:[
  {title:"Reviews",items:[active("Overview","/operations","grid"),active("Farmer Verification","/operations/verification","check"),active("Supply Reviews","/operations/supply","leaf"),active("Commodity Catalog","/operations/catalog","tag"),active("Public Enquiries","/operations/enquiries","file")]},
  {title:"Procurement pipeline",items:[planned("Buyer Requests","/operations/requests","clipboard"),planned("Matches & Quotes","/operations/matching","file"),planned("Orders & Logistics","/operations/orders","truck"),planned("Disputes","/operations/disputes","shield")]},
 ],
 SUPER_ADMIN:[
  {title:"Governance",items:[active("Overview","/admin","grid"),active("Invite Staff","/admin/staff/invite","users"),active("Staff Directory","/admin/staff","users"),active("Invitations","/admin/staff/invites","mail"),active("Roles & Permissions","/admin/permissions","shield"),active("Platform Audit","/admin/audit","file")]},
  {title:"Oversight",items:[planned("User Directory","/admin/users","user"),planned("Reports & Insights","/admin/reports","chart"),planned("Configuration","/admin/settings","settings")]},
 ],
};

export const accountNavigation:NavigationSection={title:"ACCOUNT & SUPPORT",items:[
 active("My Profile","/account/profile","user"),active("Change Password","/account/security/password","lock"),active("Contact Support","/contact","help")
]};

export function matchesWorkspacePath(path:string,href:string){
 if(path===href)return true;
 if(href==="/admin/staff"&&path.startsWith("/admin/staff/")){const section=path.split("/")[3];if(section==="invite"||section==="invites"||section==="new")return false;}
 return path.startsWith(href+"/")&&href!=="/dashboard"&&href!=="/farmer"&&href!=="/operations"&&href!=="/admin"&&href!=="/field-agent";
}
export function isWorkspaceRouteAllowedInNavigation(role:WorkspaceRole,href:string){return workspaceNavigation[role].some(section=>section.items.some(item=>item.href===href && item.availability==="active"));}
