import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/**
 * R01.3D.3E: read-only, opt-in real Supabase MFA acceptance probe.
 * Requires TWO independently managed, disposable staging identities: one at
 * AAL1, one at AAL2. No enrollment, factor deletion, token refresh, database,
 * admin client, permission update, or payment provider call.
 *
 * NEVER run against a production project. The project host and reference must
 * match the explicitly reviewed isolated staging project; all messages omit
 * user IDs, access tokens, emails, factors and provider response details.
 */
export function assertIsolatedMfaStage(env = process.env) {
  assert.equal(env.RELEASE_STAGE_CONFIRM,"I_ACKNOWLEDGE_STAGING_ONLY",
    "Explicit isolated staging acknowledgement required.");
  assert.equal(env.STAGING_MFA_TEST_ISOLATED,"true",
    "Read-only MFA acceptance requires independent staging identity signoff.");
  const ref=env.SMART_HUB_STAGE_SUPABASE_REF??"";
  const production=env.SMART_HUB_PRODUCTION_SUPABASE_REF??"";
  assert.match(ref,/^[a-z0-9]{20}$/,"Valid reviewed staging Supabase project ref required.");
  assert.match(production,/^[a-z0-9]{20}$/,"Valid reviewed production project ref required.");
  assert.notEqual(ref,production,"Staging and production project references cannot match.");
  const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL??"http://invalid");
  assert.equal(url.protocol,"https:","Staging must use HTTPS.");
  assert.equal(url.hostname,ref+".supabase.co","Refusing a Supabase host other than reviewed staging.");
  assert.equal(url.pathname,"/","Staging URL must not have a path.");
  assert.ok(!url.search&&!url.hash&&!url.username&&!url.password,
    "Staging URL must be a clean, reviewed origin.");
  assert.equal(env.PAYMENTS_ENABLED,"false","Payment features must be disabled.");
  assert.equal(env.SUPPLIER_PAYOUTS_ENABLED,"false","Payout features must be disabled.");
  assert.ok((env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"").length>=20,
    "Staging publishable key must be supplied via an environment secret.");
  for(const name of ["STAGING_MFA_AAL1_ACCESS_TOKEN","STAGING_MFA_AAL2_ACCESS_TOKEN"])
    assert.ok((env[name]??"").length>=60,
      "Two distinct, disposable isolated staging MFA session tokens are required.");
  assert.notEqual(env.STAGING_MFA_AAL1_ACCESS_TOKEN,env.STAGING_MFA_AAL2_ACCESS_TOKEN,
    "AAL1 and AAL2 test sessions cannot reuse one token.");
  return { url:url.origin, key:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    aal1:env.STAGING_MFA_AAL1_ACCESS_TOKEN,aal2:env.STAGING_MFA_AAL2_ACCESS_TOKEN };
}

export async function inspectIsolatedMfaSessions(cfg, clientFactory=createClient) {
  const client=clientFactory(cfg.url,cfg.key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const observed=new Set();
  for(const [token,expectedLevel] of [[cfg.aal1,"aal1"],[cfg.aal2,"aal2"]]){
    // getUser(token) checks with the staging Auth server, not merely decoding
    // an unverified JWT. Do not rely on caller-declared claims.
    const identity=await client.auth.getUser(token);
    if(identity.error||!identity.data.user)
      throw new Error("Staging MFA acceptance failed: Auth session could not be validated.");
    if(observed.has(identity.data.user.id))
      throw new Error("Staging MFA acceptance requires two distinct test identities.");
    observed.add(identity.data.user.id);

    // Passing the JWT asks GoTrue to validate current assurance server-side.
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
    if(assurance.error||!assurance.data||assurance.data.currentLevel!==expectedLevel)
      throw new Error("Staging MFA acceptance failed: expected assurance level not observed.");
  }
  return {status:"READ_ONLY_STAGING_MFA_OBSERVED",aal1:true,aal2:true,
    userCount:observed.size,liveRecoveryExercised:false,
    fullRoleAndRouteCoverageAccepted:false};
}

if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href) {
  try{
    const config=assertIsolatedMfaStage();
    const result=await inspectIsolatedMfaSessions(config);
    process.stdout.write(
      "Isolated staging MFA read-only provider check passed for two distinct test identities. "+
      "No account mutation, recovery action or privileged API release signoff occurred.\n");
    assert.equal(result.userCount,2);
  }catch(error){
    // Never write raw provider error fields, tokens or identifiers.
    process.stderr.write("Isolated staging MFA acceptance failed; check reviewed setup and logs privately.\n");
    process.exitCode=1;
  }
}
