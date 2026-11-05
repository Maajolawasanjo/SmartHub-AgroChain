import {createHash} from "node:crypto";
import {readFileSync,readdirSync} from "node:fs";

export function migrationManifest(root="prisma/migrations"){
 const entries=readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();
 if(!entries.length)throw Error("No Prisma migrations found in the reviewed repository.");
 const seen=new Set();
 return entries.map(name=>{
  if(!/^\d{14}_[a-z0-9_]+$/.test(name)||seen.has(name))throw Error("Invalid or repeated Prisma migration folder.");
  seen.add(name);
  const source=readFileSync(root+"/"+name+"/migration.sql");
  if(!source.length)throw Error("Empty Prisma migration SQL: "+name);
  return {name,checksum:createHash("sha256").update(source).digest("hex")};
 });
}
export function expectedModelTables(schemaSource){
 const models=[...schemaSource.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
 if(!models.length)throw Error("No Prisma models found.");
 const tables=models.map(m=>m[2].match(/@@map\("([^"]+)"\)/)?.[1]??m[1]);
 if(new Set(tables).size!==tables.length)throw Error("Duplicate Prisma table mapping.");
 return tables;
}

/**
 * Offline-pure analysis: migration history and public tables come from a
 * READ ONLY transaction in the companion script. No DB connection here.
 * Reports counts and generic errors; never credentials, rows, user names.
 */
export function assessStageInventory({manifest,modelTables,historyPresent,applied,tables,roles}){
 const errors=[],warnings=[];
 const expected=new Map(manifest.map(m=>[m.name,m.checksum]));
 const knownTables=new Set(modelTables);
 const seen=new Set();
 let completed=0;
 if(!roles.includes("anon")||!roles.includes("authenticated"))
  errors.push("Supabase roles are missing; wrong database or incomplete project.");
 for(const item of applied){
  if(seen.has(item.migration_name)){errors.push("Duplicate migration history entry.");continue;}
  seen.add(item.migration_name);
  if(!expected.has(item.migration_name)){
   errors.push("Unknown migration history entry; requires a manual schema review.");continue;
  }
  if(item.checksum!==expected.get(item.migration_name))
   errors.push("Migration checksum mismatch; migration files may have drifted.");
  if(!item.finished_at||item.rolled_back_at)
   errors.push("Incomplete or rolled-back migration requires manual recovery.");
  else completed++;
 }
 if(!historyPresent&&applied.length)
  errors.push("History cannot contain migrations without its tracking table.");
 const publicTables=tables.filter(t=>t.name!=="_prisma_migrations");
 if(!historyPresent&&publicTables.length)
  errors.push("Existing public tables have no Prisma migration history; baseline required.");
 if(historyPresent&&!applied.length&&publicTables.length)
  errors.push("Public tables exist but Prisma migration history is empty; baseline required.");
 for(const table of publicTables){
  if(!knownTables.has(table.name))
   errors.push("Unrecognized public table exists; manual database ownership review required.");
  else if(!table.rls)
   errors.push("An existing application table has row-level security disabled.");
 }
 const complete=manifest.length>0&&completed===manifest.length;
 if(complete){
  const found=new Set(publicTables.map(t=>t.name));
  for(const name of knownTables)if(!found.has(name))
   errors.push("A Prisma model table is missing despite all migrations being marked applied.");
 }
 const pending=manifest.length-completed;
 if(pending>0)warnings.push("Some reviewed migrations are not yet applied; migration approval and verified recovery are required.");
 const state=!historyPresent&&publicTables.length===0?"empty":
  complete?"complete":"partial";
 return {ok:errors.length===0,state,expectedMigrations:manifest.length,
  completedMigrations:completed,pendingMigrations:pending,existingAppTables:publicTables.length,
  totalModels:modelTables.length,errors,warnings};
}
