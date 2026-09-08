const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function clear() {
  await p.auditLog.deleteMany();
  await p.extensionRequest.deleteMany();
  await p.permitApproval.deleteMany();
  await p.hotWorkDetail.deleteMany();
  await p.confinedSpaceDetail.deleteMany();
  await p.heightWorkDetail.deleteMany();
  await p.electricalLotoDetail.deleteMany();
  await p.permit.deleteMany();
  await p.areaOwner.deleteMany();
  await p.equipment.deleteMany();
  await p.area.deleteMany();
  await p.plant.deleteMany();
  await p.user.deleteMany();
  console.log("✅ All mock data cleared from DB");
  await p.$disconnect();
}

clear().catch(async (e) => {
  console.error("❌ Error:", e.message);
  await p.$disconnect();
  process.exit(1);
});
