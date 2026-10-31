import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const singleton=globalThis as unknown as { smarthubPrisma?: PrismaClient };
export function getPrisma() {
  if (singleton.smarthubPrisma) return singleton.smarthubPrisma;
  const connectionString=process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const prisma=new PrismaClient({adapter:new PrismaPg({connectionString})});
  if (process.env.NODE_ENV !== "production") singleton.smarthubPrisma=prisma;
  return prisma;
}
