import "dotenv/config";
import { defineConfig } from "prisma/config";

// Intentionally do not configure a database URL until a SmartHub-owned
// environment is approved. This file is safe to commit without secrets.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
