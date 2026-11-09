import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/**
 * Non-secret reviewed identity of the EXISTING SmartHub Supabase backend.
 * This prevents setting an arbitrary or incorrect "production ref" in CI to
 * make the real production project appear to be a different staging project.
 *
 * A formal production migration needs a separately reviewed, explicit change
 * to this registry before staging checks can target the new infrastructure.
 * Never log database connection strings, tokens, passwords, or cookies here.
 */
const registry=JSON.parse(readFileSync(
  new URL("../../docs/implementation/r01-3d3i-environment-boundary.json",import.meta.url),
  "utf8"
));
const reference=/^[a-z0-9]{20}$/;
const reviewed=registry.production?.supabaseProjectRef;
assert.equal(registry.schemaVersion,1,"Unrecognized infrastructure registry.");
assert.match(reviewed??"",reference,"Reviewed production Supabase reference is missing.");

export const REVIEWED_PRODUCTION_SUPABASE_REF=reviewed;
export const REVIEWED_VERCEL_TEAM_SLUG=registry.production.vercelTeamSlug;

/** Do not accept a fabricated production ref supplied by environment vars. */
export function assertReviewedStagingProjectRefs(stageRef,productionRef){
  assert.match(stageRef??"",reference,"Staging Supabase project reference must have 20 lowercase characters.");
  assert.equal(productionRef,REVIEWED_PRODUCTION_SUPABASE_REF,
    "Production project reference does not match the independently reviewed SmartHub backend.");
  assert.notEqual(stageRef,REVIEWED_PRODUCTION_SUPABASE_REF,
    "Refusing to access the reviewed production SmartHub database as staging.");
  return {stagingProjectRef:stageRef,productionProjectRef:REVIEWED_PRODUCTION_SUPABASE_REF};
}
