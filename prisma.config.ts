import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma migrations must use a direct/admin connection; runtime can use a pooler.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(process.env.DIRECT_URL || process.env.DATABASE_URL ? {datasource: {url: (process.env.DIRECT_URL || process.env.DATABASE_URL)!}} : {}),
});
