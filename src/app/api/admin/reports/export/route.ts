import {NextResponse,type NextRequest} from "next/server";
import {errorReply} from "@/server/auth/http";
import {getPlatformReport,reportCsv,periodSchema} from "@/server/admin/reporting";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 try{
  const days=periodSchema.parse(request.nextUrl.searchParams.get("days")??"30");
  const report=await getPlatformReport(days);
  const csv=reportCsv(report);
  return new NextResponse(csv,{status:200,headers:{
   "Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":'attachment; filename="smarthub-governance-'+days+'d.csv"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"
  }});
 }catch(error){return errorReply(error);}
}
