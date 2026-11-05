import "server-only";
import {z} from "zod";
import {requireAdminApi} from "@/server/admin/guard";

export const periodSchema=z.enum(["7","30","90"]);
type Period=z.infer<typeof periodSchema>;
const str=(x:bigint|null|undefined)=>String(x??BigInt(0));
const fmtDate=(d:Date)=>d.toISOString().slice(0,10);
export async function getPlatformReport(period:Period="30"){
 const {db}=await requireAdminApi("platform.reports.read");
 const days=Number(period),asOf=new Date(),from=new Date(asOf.getTime()-days*86400000);
 const recent={gte:from,lte:asOf};
 const [
  accounts,activeUsers,buyers,farmerVerification,requests,orders,quotes,verifiedBuyer,
  settledSupplier,lotAggregate,lots,issueCount,paymentReview,supplierReview,
  refundReview,supportOpen,incidentsOpen,incidentsCreated,submittedField,
  recentAudits,dailyPaid
 ]=await Promise.all([
  db.account.groupBy({by:["role"],_count:{_all:true}}),
  db.account.count({where:{status:"ACTIVE"}}),
  db.buyerOrganization.count(),
  db.farmerVerification.groupBy({by:["status"],_count:{_all:true}}),
  db.buyerRequest.groupBy({by:["status"],where:{createdAt:recent},_count:{_all:true}}),
  db.order.groupBy({by:["status"],where:{createdAt:recent},_count:{_all:true}}),
  db.quotation.groupBy({by:["status"],where:{createdAt:recent},_count:{_all:true}}),
  db.paymentObligation.aggregate({where:{status:"PAID",verifiedAt:recent},_sum:{amountMinor:true},_count:{_all:true}}),
  db.$queryRawUnsafe<{count:bigint;amount:bigint}[]>(
   'SELECT COUNT(*)::bigint AS "count", COALESCE(SUM(o."amountMinor"),0)::bigint AS "amount" FROM (SELECT DISTINCT ON ("obligationId") "obligationId" FROM "supplier_settlement_attempts" WHERE "status"=\'VERIFIED\' AND "verifiedAt" >= $1::timestamp AND "verifiedAt" <= $2::timestamp ORDER BY "obligationId","verifiedAt" DESC) s JOIN "supplier_obligations" o ON o."id" = s."obligationId" WHERE o."status"=\'SETTLED\'',
   from,asOf),
  db.supplyLot.aggregate({_sum:{quantity:true,reservedQuantity:true,consumedQuantity:true}}),
  db.supplyLot.count(),
  db.deliveryIssue.count({where:{status:{in:["OPEN","UNDER_REVIEW","RESOLUTION_REQUIRED"]}}}),
  db.paymentObligation.count({where:{status:"REVIEW_REQUIRED"}}),
  db.supplierObligation.count({where:{status:"REVIEW_REQUIRED"}}),
  db.refundRequest.count({where:{status:{in:["REQUESTED","UNDER_REVIEW","RESOLUTION_REQUIRED"]}}}),
  db.supportCase.count({where:{status:{in:["OPEN","IN_PROGRESS","AWAITING_CUSTOMER"]}}}),
  db.governanceIncident.count({where:{status:{not:"CLOSED"}}}),
  db.governanceIncident.count({where:{createdAt:recent}}),
  db.fieldVisit.count({where:{status:"SUBMITTED"}}),
  db.auditEvent.count({where:{createdAt:recent}}),
  db.$queryRawUnsafe<{day:Date;count:bigint;amount:bigint}[]>(
   'SELECT date_trunc(\'day\',"verifiedAt")::date AS "day", COUNT(*)::bigint AS "count", COALESCE(SUM("amountMinor"),0)::bigint AS "amount" FROM "payment_obligations" WHERE "status"=\'PAID\' AND "verifiedAt">=$1::timestamp AND "verifiedAt"<=$2::timestamp GROUP BY 1 ORDER BY 1',
   from,asOf)
 ]);
 const counts=(rows:{status:string;_count:{_all:number}}[])=>rows.map(x=>({status:x.status,count:x._count._all}));
 const supplier=settledSupplier[0]??{count:BigInt(0),amount:BigInt(0)};
 return {
  period,days,from:from.toISOString(),asOf:asOf.toISOString(),
  identities:{byRole:accounts.map(a=>({role:a.role,count:a._count._all})),active:activeUsers,
    buyerOrganizations:buyers,farmerVerification:counts(farmerVerification)},
  pipeline:{buyerRequests:counts(requests),quotations:counts(quotes),orders:counts(orders)},
  finance:{
   paidBuyerObligations:verifiedBuyer._count._all,paidBuyerMinor:str(verifiedBuyer._sum.amountMinor),
   providerVerifiedSupplierTransfers:str(supplier.count),supplierTransferMinor:str(supplier.amount)
  },
  inventory:{lots,recordedQuantity:lotAggregate._sum.quantity?.toString()??"0",
   reservedQuantity:lotAggregate._sum.reservedQuantity?.toString()??"0",
   consumedQuantity:lotAggregate._sum.consumedQuantity?.toString()??"0"},
  risk:{openDeliveryIssues:issueCount,paymentReview,supplierReview,refundReview,
   openSupport:supportOpen,openGovernanceIncidents:incidentsOpen,
   newGovernanceIncidents:incidentsCreated,submittedFieldVisits:submittedField,recentAuditEvents:recentAudits},
  buyerDaily:dailyPaid.map(d=>({day:fmtDate(d.day),count:str(d.count),amountMinor:str(d.amount)}))
 };
}
export type PlatformReport=Awaited<ReturnType<typeof getPlatformReport>>;
export function reportCsv(report:PlatformReport){
 const lines:[string,string,string][]=[
  ["group","metric","value"],
  ["period","from_utc",report.from],["period","as_of_utc",report.asOf],
  ["identity","active_accounts",String(report.identities.active)],
  ["identity","buyer_organizations",String(report.identities.buyerOrganizations)],
  ["finance","buyer_paid_obligations",String(report.finance.paidBuyerObligations)],
  ["finance","buyer_provider_verified_ngn_kobo",report.finance.paidBuyerMinor],
  ["finance","farmer_provider_verified_transfer_count",report.finance.providerVerifiedSupplierTransfers],
  ["finance","farmer_provider_verified_ngn_kobo",report.finance.supplierTransferMinor],
  ["inventory","verified_lots",String(report.inventory.lots)],
  ["inventory","recorded_quantity",report.inventory.recordedQuantity],
  ["inventory","reserved_quantity",report.inventory.reservedQuantity],
  ["inventory","consumed_quantity",report.inventory.consumedQuantity],
  ...Object.entries(report.risk).map(([k,v])=>["risk",k,String(v)] as [string,string,string]),
  ...report.identities.byRole.map(v=>["roles",v.role,String(v.count)] as [string,string,string]),
  ...report.pipeline.orders.map(v=>["orders",v.status,String(v.count)] as [string,string,string]),
  ...report.pipeline.quotations.map(v=>["quotations",v.status,String(v.count)] as [string,string,string]),
  ...report.pipeline.buyerRequests.map(v=>["requests",v.status,String(v.count)] as [string,string,string]),
  ...report.buyerDaily.map(v=>["buyer_paid_daily",v.day,v.amountMinor] as [string,string,string])
 ];
 const cell=(value:string)=>'"'+(/^[\s]*[=+\-@]/.test(value)?"'":"")+value.replaceAll('"','""')+'"';
 return lines.map(l=>l.map(cell).join(",")).join("\r\n")+"\r\n";
}
export function operationalFlags(){
 // Administrative state only; never expose configured URLs, keys, names or provider secrets.
 return {
  buyerCheckoutEnabled:process.env.PAYMENTS_ENABLED==="true",
  supplierPayoutEnabled:process.env.SUPPLIER_PAYOUTS_ENABLED==="true",
  operationalNotifications:"in-app only",
  automatedRefunds:"not implemented",
  databaseConfigured:!!process.env.DATABASE_URL
 };
}
