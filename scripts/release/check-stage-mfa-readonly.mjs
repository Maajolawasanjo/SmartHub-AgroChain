import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/**
 * R01.3D.3E: read-only, opt-in real Supabase MFA acceptance probe.
 * Requires TWO independently managed, disposable staging identities with
 * verified TOTP: one at AAL1 (awaiting challenge), one at AAL2 (challenged). No enrollment, factor deletion, token refresh, database,
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
  // Test identities must be separately reviewed, never inferred from a
  // client-submitted claim or from whichever JWT happens to be provided.
  const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const expectedAal1=env.STAGING_MFA_AAL1_EXPECTED_USER_ID??"";
  const expectedAal2=env.STAGING_MFA_AAL2_EXPECTED_USER_ID??"";
  assert.match(expectedAal1,idPattern,"Reviewed disposable AAL1 user ID is required.");
  assert.match(expectedAal2,idPattern,"Reviewed disposable AAL2 user ID is required.");
  assert.notEqual(expectedAal1.toLowerCase(),expectedAal2.toLowerCase(),
    "MFA acceptance requires two distinct reviewed identities.");
  return { url:url.origin, key:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    aal1:env.STAGING_MFA_AAL1_ACCESS_TOKEN,aal2:env.STAGING_MFA_AAL2_ACCESS_TOKEN,
    expectedAal1UserId:expectedAal1,expectedAal2UserId:expectedAal2 };
}

export async function inspectIsolatedMfaSessions(cfg, clientFactory=createClient) {
  const client=clientFactory(cfg.url,cfg.key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const observed=new Set();
  for(const [token,expectedLevel,expectedUserId] of [
    [cfg.aal1,"aal1",cfg.expectedAal1UserId],
    [cfg.aal2,"aal2",cfg.expectedAal2UserId]
  ]){
    // getUser(token) checks with the exact staging Auth server; do not trust
    // local JWT decoding, role metadata or an arbitrary test-token owner.
    const identity=await client.auth.getUser(token);
    if(identity.error||!identity.data?.user)
      throw new Error("Staging MFA acceptance failed: Auth session could not be validated.");
    const user=identity.data.user;
    if(user.id!==expectedUserId)
      throw new Error("Staging MFA acceptance failed: session does not belong to its reviewed test identity.");
    if(user.is_anonymous===true||!user.email_confirmed_at)
      throw new Error("Staging MFA acceptance failed: test identity is not a confirmed non-anonymous user.");
    if(observed.has(user.id))
      throw new Error("Staging MFA acceptance requires two distinct test identities.");
    observed.add(user.id);
    // Supabase Auth's user response (not user_metadata) must include an
    // independently verified TOTP factor for the *same* authenticated user.
    if(!Array.isArray(user.factors)||
       !user.factors.some(f=>f.factor_type==="totp"&&f.status==="verified"))
      throw new Error("Staging MFA acceptance failed: a verified TOTP factor was not observed.");

    // Passing a JWT makes GoTrue validate the token and factor state.
    // Requiring nextLevel=aal2 detects stale AAL2 tokens after a factor was
    // removed. AMR must show the actual TOTP challenge only for the AAL2
    // identity, rather than equating any AAL2 factor with TOTP.
    const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
    if(assurance.error||!assurance.data||
       assurance.data.currentLevel!==expectedLevel||
       assurance.data.nextLevel!=="aal2")
      throw new Error("Staging MFA acceptance failed: current and next assurance levels do not match the reviewed case.");
    const methods=assurance.data.currentAuthenticationMethods;
    if(!Array.isArray(methods))
      throw new Error("Staging MFA acceptance failed: authentication method evidence is missing.");
    const usedTotp=methods.some(method=>{
      const name=typeof method==="string"?method:method?.method;
      return name==="totp"||name==="mfa/totp";
    });
    if((expectedLevel==="aal2")!==usedTotp)
      throw new Error("Staging MFA acceptance failed: TOTP challenge evidence is inconsistent with the expected session.");
  }
  return {status:"READ_ONLY_STAGING_MFA_OBSERVED",aal1:true,aal2:true,
    userCount:observed.size,totpFactorAndChallengeVerified:true,
    liveRecoveryExercised:false,fullRoleAndRouteCoverageAccepted:false};
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
