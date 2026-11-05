import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma migration commands must use DIRECT_URL exclusively: never fall back
// to the serverless runtime's transaction pooler (DATABASE_URL). Generation
// and static checks can still load this config without live database secrets.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(process.env.DIRECT_URL ? { datasource: { url: process.env.DIRECT_URL } } : {}),
});
