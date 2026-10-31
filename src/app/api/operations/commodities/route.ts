import type {NextRequest} from "next/server";
import {agriculturePost} from "@/server/agriculture/response";
import {createCommodity} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest){return agriculturePost(req,createCommodity,"/operations/catalog");}
