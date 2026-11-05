/**
 * READ-ONLY commerce integrity checks. Return aggregate counts only; do not
 * select buyer/farmer identities, order references, or individual records.
 * Run only after the reviewed Prisma migrations are fully present.
 */
export const commerceInvariants=[
 {id:"buyer_membership_role",sql:
  'SELECT COUNT(*)::int AS n FROM public."buyer_memberships" m JOIN public."app_accounts" a ON a.id=m."accountId" WHERE a.role<>\'BUYER\''},
 {id:"farmer_supply_farm_owner",sql:
  'SELECT COUNT(*)::int AS n FROM public."supply_declarations" s JOIN public."farms" f ON f.id=s."farmId" WHERE f."farmerId"<>s."farmerId"'},
 {id:"order_buyer_organization",sql:
  'SELECT COUNT(*)::int AS n FROM public."orders" o JOIN public."quotations" q ON q.id=o."quotationId" JOIN public."buyer_requests" r ON r.id=q."requestId" WHERE o."organizationId"<>r."organizationId"'},
 {id:"order_quote_revision",sql:
  'SELECT COUNT(*)::int AS n FROM public."orders" o JOIN public."quote_revisions" v ON v.id=o."revisionId" WHERE v."quoteId"<>o."quotationId"'},
 {id:"order_line_revision",sql:
  'SELECT COUNT(*)::int AS n FROM public."order_lines" l JOIN public."orders" o ON o.id=l."orderId" JOIN public."quote_lines" ql ON ql.id=l."quoteLineId" WHERE ql."revisionId"<>o."revisionId"'},
 {id:"order_lot_matches_quote_source",sql:
  'SELECT COUNT(*)::int AS n FROM public."order_lines" l JOIN public."quote_lines" ql ON ql.id=l."quoteLineId" JOIN public."match_proposals" mp ON mp.id=ql."matchId" JOIN public."supply_lots" sl ON sl.id=l."lotId" WHERE sl."supplyId"<>mp."supplyId"'},
 {id:"order_reservation_integrity",sql:
  'SELECT COUNT(*)::int AS n FROM public."order_lines" l LEFT JOIN public."reservations" r ON r."orderLineId"=l.id WHERE r.id IS NULL OR r."lotId"<>l."lotId" OR r.quantity<>l.quantity'},
 {id:"inactive_order_active_reservations",sql:
  'SELECT COUNT(*)::int AS n FROM public."reservations" r JOIN public."order_lines" l ON l.id=r."orderLineId" JOIN public."orders" o ON o.id=l."orderId" WHERE o.status IN (\'CANCELLED\',\'EXPIRED\') AND r.status=\'ACTIVE\''},
];
export async function inspectCommerceInvariants(query){
 const failures=[];
 for(const c of commerceInvariants){
  const result=await query(c.sql);
  if(result.rows[0]?.n!==0)failures.push({id:c.id,count:result.rows[0]?.n??null});
 }
 return {ok:failures.length===0,checks:commerceInvariants.length,failures};
}
