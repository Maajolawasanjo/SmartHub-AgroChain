/** Re-run the pinned compiler; compatible with TypeScript's native runtime. */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const cmd = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "./node_modules/.bin/tsc";
if (!existsSync(cmd)) {
 console.error("Missing local TypeScript compiler. Run npm ci first.");
 process.exitCode=1;
} else {
 try {
   execFileSync(cmd,["--noEmit","--pretty","false"],{stdio:"inherit"});
   console.log("All project TypeScript/TSX sources passed the compiler gate.");
 } catch {
   process.exitCode=1;
 }
}
