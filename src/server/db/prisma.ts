import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// A warm Vercel function must reuse one Prisma client/pool; a new client per
// request can exhaust Supabase's available backend connections.
const singleton=globalThis as unknown as { smarthubPrisma?: PrismaClient };

function poolMaximum() {
  const raw=process.env.SMART_HUB_DB_POOL_MAX??"3";
  if(!/^[1-9]\d?$/.test(raw))throw new Error("SMART_HUB_DB_POOL_MAX must be an integer between 1 and 10");
  const size=Number(raw);
  if(size>10)throw new Error("SMART_HUB_DB_POOL_MAX must not exceed 10 connections per instance");
  return size;
}

export function getPrisma() {
  if(singleton.smarthubPrisma)return singleton.smarthubPrisma;
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error("DATABASE_URL missing");
  const adapter=new PrismaPg({
    connectionString,
    // Prisma 7 uses the underlying pg driver's pool settings, not v6 URL
    // connection_limit parameters. Start small for serverless concurrency.
    max:poolMaximum(),
    connectionTimeoutMillis:5000,
    idleTimeoutMillis:10000
  });
  const client=new PrismaClient({adapter});
  singleton.smarthubPrisma=client;
  return client;
}
