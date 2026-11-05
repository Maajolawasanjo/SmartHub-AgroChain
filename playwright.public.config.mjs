import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir:"./e2e",
  testMatch:"public.acceptance.spec.mjs",
  fullyParallel:false,
  workers:1,
  retries:0,
  reporter:"line",
  timeout:45000,
  expect:{timeout:15000},
  use:{
    baseURL:"http://127.0.0.1:3188",
    headless:true,
    trace:"off",
    screenshot:"off",
    video:"off",
    ignoreHTTPSErrors:false
  },
  webServer:{
    command:"npm run start -- --hostname 127.0.0.1 --port 3188",
    url:"http://127.0.0.1:3188",
    timeout:120000,
    reuseExistingServer:false,
    env:{
      DATABASE_URL:"",
      DIRECT_URL:"",
      PUBLIC_CONTACT_ENABLED:"false",
      PAYMENTS_ENABLED:"false",
      SUPPLIER_PAYOUTS_ENABLED:"false",
      PUBLIC_SIGNUP_ENABLED:"false",
      RELEASE_ACCEPTANCE_ENABLED:"false"
    }
  }
});
