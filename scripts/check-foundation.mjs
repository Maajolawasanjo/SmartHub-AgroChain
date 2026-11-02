import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const strict=process.argv.includes("--require-lock"),errors=[],warnings=[];
const check=(value,message)=>{if(!value)errors.push(message)};
for(const file of ["package.json","prisma/schema.prisma","prisma.config.ts","src/proxy.ts","src/app/layout.tsx","src/server/auth/context.ts",".env.example",".github/workflows/ci.yml",".nvmrc"]){
 check(existsSync(file),"Missing foundation file: "+file);
}
const pkg=JSON.parse(readFileSync("package.json","utf8"));
check(pkg.private===true,"Package must remain private");
check(Boolean(pkg.dependencies?.dotenv),"Missing direct dotenv dependency for Prisma config");
check(pkg.dependencies?.["@prisma/client"]===pkg.devDependencies?.prisma,"Prisma Client and CLI versions must match");
check(pkg.dependencies?.["@prisma/adapter-pg"]===pkg.devDependencies?.prisma,"Prisma adapter and CLI versions must match");
for(const key of ["db:generate","typecheck","test","build","verify:syntax"])check(Boolean(pkg.scripts?.[key]),"Missing npm script: "+key);
const example=readFileSync(".env.example","utf8");
for(const key of ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","DATABASE_URL","DIRECT_URL","AUTH_RECOVERY_SECRET"]){
 check(new RegExp("^"+key+"=","m").test(example),"Missing environment template entry: "+key);
}
check(!/^NEXT_PUBLIC_(?:SUPABASE_SECRET_KEY|DATABASE_URL|DIRECT_URL|AUTH_RECOVERY_SECRET)=/m.test(example),"Sensitive key exposed with NEXT_PUBLIC_");
if(!existsSync("package-lock.json")){
 (strict?errors:warnings).push("package-lock.json absent: generate online, review and commit before release.");
}else{
 try{
  const lock=JSON.parse(readFileSync("package-lock.json","utf8"));
  check(lock.lockfileVersion>=3,"Unsupported lockfile version");
  check(lock.packages?.[""]?.name===pkg.name,"Lockfile package name mismatch");
  for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
   const actual=lock.packages?.[""]?.dependencies?.[name]??lock.packages?.[""]?.devDependencies?.[name];
   check(actual===version,"Lockfile dependency mismatch: "+name);
  }
  if(strict){
   try{execFileSync("git",["ls-files","--error-unmatch","package-lock.json"],{stdio:"ignore"})}
   catch{errors.push("package-lock.json must be committed, not generated during CI")}
  }
 }catch(e){errors.push("Invalid lockfile: "+e.message)}
}
try{
 const tracked=execFileSync("git",["ls-files"],{encoding:"utf8"}).split("\n");
 check(!tracked.some(s=>/^\.env(?:\.|$)/.test(s)&&s!==".env.example"),"Sensitive .env file tracked by Git");
}catch{warnings.push("Git index unavailable; secret-file check skipped")}
for(const w of warnings)console.warn("WARN:",w);
for(const e of errors)console.error("ERROR:",e);
console.log("Foundation preflight: "+errors.length+" error(s), "+warnings.length+" warning(s)");
if(errors.length)process.exitCode=1;
