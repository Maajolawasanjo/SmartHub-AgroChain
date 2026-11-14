// A deliberately fixed, disposable GitHub runner database, never a Supabase
// project. No host, connection or role values are taken from user input.
export const CI_DATABASE_URL =
 "postgresql://postgres:ci_only_ephemeral_password@127.0.0.1:5432/postgres?sslmode=disable";

export function assertEphemeralCIEnvironment(env=process.env){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="Maajolawasanjo/SmartHub-AgroChain"||
    env.SMART_HUB_CI_POSTGRES_ONLY!=="I_ACKNOWLEDGE_EPHEMERAL_POSTGRES")
  throw Error("Disposable PostgreSQL integration is restricted to this repository's GitHub Actions runner.");
 if(env.DIRECT_URL!==CI_DATABASE_URL||env.DATABASE_URL!==CI_DATABASE_URL)
  throw Error("Disposable PostgreSQL integration refused nonlocal or modified database URLs.");
 if(env.VERCEL_ENV||env.SMART_HUB_PRODUCTION_SUPABASE_REF||
    env.SMART_HUB_STAGE_SUPABASE_REF||env.NEXT_PUBLIC_SUPABASE_URL||
    env.SUPABASE_SECRET_KEY||env.RELEASE_STAGE_CONFIRM)
  throw Error("Disposable PostgreSQL integration cannot inherit Supabase or release environment settings.");
 return CI_DATABASE_URL;
}
