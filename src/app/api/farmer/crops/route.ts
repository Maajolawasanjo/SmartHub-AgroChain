import type {NextRequest} from "next/server";
import {agriculturePost} from "@/server/agriculture/response";
import {createCrop} from "@/server/agriculture/actions";
export const runtime="nodejs";
export async function POST(req:NextRequest){return agriculturePost(req,createCrop,"/farmer/my-supply/crops");}
