import * as ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
const files=[];
function scan(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,item.name);
  if(item.isDirectory()&&!["node_modules","generated",".next"].includes(item.name))scan(p);
  else if(item.isFile()&&[".ts",".tsx"].includes(extname(p)))files.push(p);
 }
}
scan("src");
for(const path of ["prisma.config.ts","next.config.ts"])files.push(path);
let errors=0;
for(const file of files){
 const source=ts.createSourceFile(file,readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const d of source.parseDiagnostics){
  console.error(file,ts.flattenDiagnosticMessageText(d.messageText," "));
  errors++;
 }
}
console.log("TypeScript syntax parsed: "+files.length+" files; "+errors+" errors");
if(errors)process.exitCode=1;
