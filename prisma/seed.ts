// Seed script — creates users, plants, areas, and equipment.
// No demo permits are created — all permits will be real ones raised through the UI.
// Run with: npm run seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data in correct dependency order
  await prisma.auditLog.deleteMany();
  await prisma.extensionRequest.deleteMany();
  await prisma.permitApproval.deleteMany();
  await prisma.hotWorkDetail.deleteMany();
  await prisma.confinedSpaceDetail.deleteMany();
  await prisma.heightWorkDetail.deleteMany();
  await prisma.electricalLotoDetail.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.areaOwner.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.area.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash("password123", 10);

  // ─── Users ────────────────────────────────────────────────────────────────
  const areaOwner = await prisma.user.create({
    data: { name: "Priya Sundaram", email: "areaowner@ptw.dev", passwordHash: pw, role: "AREA_OWNER" },
  });
  await prisma.user.createMany({
    data: [
      { name: "Arjun Mehta",    email: "requester@ptw.dev", passwordHash: pw, role: "REQUESTER" },
      { name: "Rajan Pillai",   email: "safety@ptw.dev",    passwordHash: pw, role: "SAFETY_OFFICER" },
      { name: "Divya Krishnan", email: "admin@ptw.dev",     passwordHash: pw, role: "ADMIN" },
    ],
  });
  console.log("✓ Users created");

  // ─── Plants ───────────────────────────────────────────────────────────────
  const plant1 = await prisma.plant.create({ data: { name: "Chennai Refinery", code: "CR" } });
  const plant2 = await prisma.plant.create({ data: { name: "Vizag Chemical Plant", code: "VZ" } });

  // ─── Areas ────────────────────────────────────────────────────────────────
  const areaA = await prisma.area.create({ data: { name: "Area A — Distillation", plantId: plant1.id } });
  const areaB = await prisma.area.create({ data: { name: "Area B — Storage Tank Farm", plantId: plant1.id } });
  const areaC = await prisma.area.create({ data: { name: "Process Block 1", plantId: plant2.id } });
  const areaD = await prisma.area.create({ data: { name: "Electrical Substation", plantId: plant2.id } });

  // Area owner owns Area A and Area B
  await prisma.areaOwner.createMany({
    data: [
      { areaId: areaA.id, userId: areaOwner.id },
      { areaId: areaB.id, userId: areaOwner.id },
    ],
  });
  console.log("✓ Plants, areas, area ownership set");

  // ─── Equipment ────────────────────────────────────────────────────────────
  await prisma.equipment.createMany({
    data: [
      { tag: "CR-P-001",  name: "Crude Distillation Pump",    description: "Main transfer pump, Area A",          areaId: areaA.id },
      { tag: "CR-V-012",  name: "Crude Distillation Column",  description: "Atmospheric distillation tower",       areaId: areaA.id },
      { tag: "CR-TK-003", name: "Naphtha Storage Tank",       description: "Floating roof, 5000 kL capacity",     areaId: areaB.id },
      { tag: "VZ-HX-001", name: "Process Heat Exchanger",     description: "Shell-and-tube, Process Block 1",     areaId: areaC.id },
      { tag: "VZ-R-002",  name: "Reactor Vessel R-200",       description: "Fixed-bed catalytic reactor",         areaId: areaC.id },
      { tag: "VZ-ES-001", name: "Main Switchgear Panel",      description: "11kV distribution panel",             areaId: areaD.id },
    ],
  });
  console.log("✓ Equipment created");

  console.log("\n✅ Seed complete — system is empty and ready for real permits.");
  console.log("\nDemo credentials (all use password123):");
  console.log("  requester@ptw.dev  →  REQUESTER");
  console.log("  areaowner@ptw.dev  →  AREA_OWNER (owns Area A & B, Chennai Refinery)");
  console.log("  safety@ptw.dev     →  SAFETY_OFFICER");
  console.log("  admin@ptw.dev      →  ADMIN\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
