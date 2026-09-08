const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.$queryRawUnsafe("SELECT 1 as ok")
  .then((r) => {
    console.log("✅ Connected to Supabase:", JSON.stringify(r));
    return p.$disconnect();
  })
  .catch((e) => {
    console.error("❌ Connection failed:", e.message);
    return p.$disconnect();
  });
