import {createHash} from "node:crypto";
import {readFileSync,readdirSync} from "node:fs";
import pg from "pg";
import {ensureStageScriptEnvironment} from "./stage-target.mjs";
import {inspectCommerceInvariants} from "./commerce-invariants.mjs";

const cfg=ensureStageScriptEnvironment();
if(!cfg)process.exit(1);
const client=new pg.Client({connectionString:cfg.databaseUrl,connectionTimeoutMillis:10000,
 statement_timeout:30000,application_name:"smarthub-staging-readonly-acceptance"});
const problems=[];
const check=(ok,label)=>{if(!ok)problems.push(label);};
function failAll(){
 if(problems.length)throw new Error("Staging database acceptance FAILED: "+problems.map((s,i)=>(i+1)+". "+s).join(" | "));
}
const sql=(query,args=[])=>client.query(query,args);
const schema=readFileSync("prisma/schema.prisma","utf8");
const modelMaps=new Map([...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((m)=>{
 const map=m[2].match(/@@map\("([^"]+)"\)/);
 return [m[1],map?.[1]??m[1]];
}));
const privilegedModels=[
 "Account","AuditEvent","BuyerOrganization","BuyerMembership","FarmerVerification",
 "FieldVisit","FieldVisitEvidence","Farm","SupplyDeclaration","SupplyLot",
 "Order","OrderLine","Reservation","StockMovement","PaymentObligation","PaymentAttempt",
 "PaymentProviderEvent","PaymentReconciliation","RefundRequest","SupplierObligation",
 "SupplierSettlementAttempt","SupplierSettlementReconciliation","Shipment","ShipmentLine",
 "ShipmentEvidence","ReceiptConfirmation","ReceiptLine","DeliveryIssue","OutboxEvent",
 "Notification","SupportCase","SupportMessage","GovernanceIncident","GovernanceIncidentEvent"
];
try{
 await client.connect();
 await sql("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 const roles=await sql("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
 check(roles.rows.length===2,"Supabase anon/authenticated roles were not found");
 const localMigrations=readdirSync("prisma/migrations",{withFileTypes:true})
  .filter(d=>d.isDirectory()).map(d=>d.name).sort();
 const applied=await sql('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public."_prisma_migrations"');
 const byMigration=new Map(applied.rows.map(row=>[row.migration_name,row]));
 for(const name of localMigrations){
  const entry=byMigration.get(name),file="prisma/migrations/"+name+"/migration.sql";
  const bytes=readFileSync(file);
  check(!!entry,"Unapplied migration: "+name);
  if(!entry)continue;
  check(entry.finished_at!==null&&entry.rolled_back_at===null,"Incomplete/rolled-back migration: "+name);
  const digest=createHash("sha256").update(bytes).digest("hex");
  check(entry.checksum===digest,"Migration checksum drift: "+name);
 }
 for(const remote of byMigration.keys())
  check(localMigrations.includes(remote),"Database contains unknown migration not checked into repository: "+remote);
 const tables=await sql(
  "SELECT c.relname AS name,c.relrowsecurity AS rls,"+
  " has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,"+
  " has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS user_access"+
  " FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace"+
  " WHERE n.nspname='public' AND c.relkind='r'"
 );
 const byTable=new Map(tables.rows.map(r=>[r.name,r]));
 for(const [model,name] of modelMaps){
  const info=byTable.get(name);
  check(!!info,"Schema model "+model+" missing database table "+name);
  if(info)check(info.rls,"Row-level security is DISABLED on "+name);
 }
 for(const model of privilegedModels){
  const table=modelMaps.get(model);
  check(!!table,"Privileged model missing from schema: "+model);
  if(!table)continue;
  const record=byTable.get(table);
  if(!record)continue;
  check(!record.anon_access&&!record.user_access,
   "Privileged table unexpectedly granted to anon/authenticated: "+table);
 }
 // Supabase's private object storage bucket must never accidentally be public.
 const bucket=await sql("SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id = ANY($1::text[])",[
  [process.env.FIELD_EVIDENCE_BUCKET??"field-visit-evidence",process.env.SHIPMENT_EVIDENCE_BUCKET??"shipment-evidence"]
 ]);
 for(const name of [process.env.FIELD_EVIDENCE_BUCKET??"field-visit-evidence",
   process.env.SHIPMENT_EVIDENCE_BUCKET??"shipment-evidence"]){
  const row=bucket.rows.find(r=>r.id===name);
  check(!!row,"Missing required evidence Storage bucket: "+name);
  if(row)check(row.public===false,"A private evidence bucket is PUBLIC: "+name);
 }
 // Authoritative invariant checks: no over-allocated lots, inflated split shipments,
 // settlement without a provider-verified attempt or completed orders with unresolved issues.
 const checks=[
  {name:"lot conservation",q:'SELECT COUNT(*)::int AS n FROM public."supply_lots" WHERE "reservedQuantity"<0 OR "consumedQuantity"<0 OR "reservedQuantity"+"consumedQuantity">"quantity"'},
  {name:"over-allocated physical shipments",q:'SELECT COUNT(*)::int AS n FROM (SELECT l."orderLineId" FROM public."shipment_lines" l JOIN public."shipments" s ON s.id=l."shipmentId" JOIN public."order_lines" o ON o.id=l."orderLineId" WHERE s.status<>$1 GROUP BY l."orderLineId",o.quantity HAVING SUM(l.quantity)>o.quantity) t',params:["CANCELLED"]},
  {name:"settled supplier obligations without verified transfer",q:'SELECT COUNT(*)::int AS n FROM public."supplier_obligations" o WHERE o.status=$1 AND NOT EXISTS (SELECT 1 FROM public."supplier_settlement_attempts" a WHERE a."obligationId"=o.id AND a.status=$2)',params:["SETTLED","VERIFIED"]},
  {name:"completed orders with unresolved delivery issues",q:'SELECT COUNT(*)::int AS n FROM public."orders" o JOIN public."fulfillment_plans" p ON p."orderId"=o.id JOIN public."shipments" s ON s."planId"=p.id JOIN public."delivery_issues" d ON d."shipmentId"=s.id WHERE o.status=$1 AND d.status IN ($2,$3,$4)',params:["COMPLETED","OPEN","UNDER_REVIEW","RESOLUTION_REQUIRED"]},
  {name:"cleared unfulfilled orders without paid obligation",q:'SELECT COUNT(*)::int AS n FROM public."orders" o LEFT JOIN public."payment_obligations" p ON p."orderId"=o.id WHERE o.status IN ($1,$2) AND (p.id IS NULL OR p.status<>$3)',params:["PAYMENT_VERIFIED","FULFILLING","PAID"]}
 ];
 for(const c of checks){
  const result=await sql(c.q,c.params??[]);
  check(result.rows[0]?.n===0,c.name+" invariant violated ("+(result.rows[0]?.n??"unknown")+" records)");
 }
 const commerce=await inspectCommerceInvariants(sql);
 for(const failed of commerce.failures)check(false,"Commerce relationship "+failed.id+" inconsistent ("+failed.count+" records)");
 await sql("ROLLBACK");
 failAll();
 console.log("PASS: staging database migration history, schema, RLS, private grants, evidence bucket, safety invariants and commerce relationships.");
 console.log("Checked",localMigrations.length,"migration directories and",modelMaps.size,"Prisma model tables. No data was modified.");
}catch(error){
 try{await client.query("ROLLBACK");}catch{}
 console.error("FAIL: staging database acceptance:",error instanceof Error?error.message:"unknown database validation error");
 process.exitCode=1;
}finally{await client.end().catch(()=>undefined);}
