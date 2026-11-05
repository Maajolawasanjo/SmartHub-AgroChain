import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHmac,timingSafeEqual} from "node:crypto";
import vm from "node:vm";

const src=readFileSync("src/server/payments/paystack.ts","utf8");
const keySource=src.slice(src.indexOf("export function secretKey()"),src.indexOf("export function checkoutCallback()"))
 .replace("export function secretKey()","function secretKey()");
const signatureSource=src.slice(src.indexOf("function validHex("),src.indexOf("export function hashPayload("))
 .replace("function validHex(expected:Buffer,received:string)","function validHex(expected,received)")
 .replace("export function verifyWebhookSignature(raw:Buffer,headers:Headers,nowSeconds=Math.floor(Date.now()/1000)):\"v1\"|\"legacy\"|null",
          "function verifyWebhookSignature(raw,headers,nowSeconds=Math.floor(Date.now()/1000))")
 .replace("let key:string;","let key;");
assert.ok(keySource.startsWith("function secretKey()"));
assert.ok(signatureSource.includes("function verifyWebhookSignature("));
class PublicError extends Error{constructor(status,message){super(message);this.status=status;}}
const env={NODE_ENV:"production",APP_BASE_URL:"https://staging.example.test",
 PRODUCTION_BASE_URL:"https://smarthub.example.test",PAYSTACK_LIVE_ENABLED:"false",
 PAYSTACK_SECRET_KEY:"sk_test_localonly",PAYSTACK_WEBHOOK_SECRET:"whsec_localonly"};
const ctx={URL,Buffer,createHmac,timingSafeEqual,process:{env},PublicError,Headers,Date,Math};
vm.runInNewContext(keySource+"\n"+signatureSource,ctx,{timeout:1000});
const verify=ctx.verifyWebhookSignature;
const body=Buffer.from(JSON.stringify({event:"charge.success",data:{reference:"SMH-ABC"}}));
const legacy=key=>createHmac("sha512",key).update(body).digest("hex");
const modern=(time,secret)=>createHmac("sha512",secret).update(String(time)).update(".").update(body).digest("hex");
test("valid test-mode legacy signature accepted with configured test key",()=>{
 const headers=new Headers({"x-paystack-signature":legacy(env.PAYSTACK_SECRET_KEY)});
 assert.equal(verify(body,headers,1762344000),"legacy");
});
test("legacy live signature blocked on preview despite valid HMAC",()=>{
 env.PAYSTACK_SECRET_KEY="sk_live_localonly";
 const headers=new Headers({"x-paystack-signature":legacy(env.PAYSTACK_SECRET_KEY)});
 assert.equal(verify(body,headers,1762344000),null);
 env.PAYSTACK_SECRET_KEY="sk_test_localonly";
});
test("legacy live signature accepted only after explicit approved production setup",()=>{
 env.PAYSTACK_SECRET_KEY="sk_live_localonly";
 env.PAYSTACK_LIVE_ENABLED="true";
 env.APP_BASE_URL=env.PRODUCTION_BASE_URL;
 const headers=new Headers({"x-paystack-signature":legacy(env.PAYSTACK_SECRET_KEY)});
 assert.equal(verify(body,headers,1762344000),"legacy");
 env.PAYSTACK_SECRET_KEY="sk_test_localonly";
 env.PAYSTACK_LIVE_ENABLED="false";
 env.APP_BASE_URL="https://staging.example.test";
});
test("modern signed header prevents downgrade to legacy and rejects old timestamps",()=>{
 const now=1762344000;
 const sign=modern(now,env.PAYSTACK_WEBHOOK_SECRET);
 const headers=new Headers({"paystack-signature":"t="+now+",v1=whk_test:"+sign,
   "x-paystack-signature":legacy(env.PAYSTACK_SECRET_KEY)});
 assert.equal(verify(body,headers,now),"v1");
 headers.set("paystack-signature","t="+(now-601)+",v1=whk_test:"+modern(now-601,env.PAYSTACK_WEBHOOK_SECRET));
 assert.equal(verify(body,headers,now),null);
 headers.set("paystack-signature","incorrect");
 assert.equal(verify(body,headers,now),null);
});
