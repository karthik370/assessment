import { defineConfig } from "prisma/config";

// Prisma 7 config — connection URL is read from DATABASE_URL env var
// The prisma CLI reads this file for migrate commands
export default defineConfig({
  schema: "./prisma/schema.prisma",
});
