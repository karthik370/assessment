// Seed script — creates the minimum data to demo the system in under 2 minutes.
// Run with: npx prisma db seed  (or: npx tsx prisma/seed.ts)
//
// Creates:
//   4 users (one per role)
//   2 plants, 4 areas, 6 equipment items
//   10 permits spread across all statuses

import { PrismaClient, PermitType, PermitStatus } from "@prisma/client";
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
  const requester = await prisma.user.create({
    data: {
      name: "Arjun Mehta",
      email: "requester@ptw.dev",
      passwordHash: pw,
      role: "REQUESTER",
    },
  });

  const areaOwner = await prisma.user.create({
    data: {
      name: "Priya Sundaram",
      email: "areaowner@ptw.dev",
      passwordHash: pw,
      role: "AREA_OWNER",
    },
  });

  const safetyOfficer = await prisma.user.create({
    data: {
      name: "Rajan Pillai",
      email: "safety@ptw.dev",
      passwordHash: pw,
      role: "SAFETY_OFFICER",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Divya Krishnan",
      email: "admin@ptw.dev",
      passwordHash: pw,
      role: "ADMIN",
    },
  });

  console.log("✓ Users created");

  // ─── Plants ───────────────────────────────────────────────────────────────
  const plant1 = await prisma.plant.create({
    data: { name: "Chennai Refinery", code: "CR" },
  });

  const plant2 = await prisma.plant.create({
    data: { name: "Vizag Chemical Plant", code: "VZ" },
  });

  // ─── Areas ────────────────────────────────────────────────────────────────
  const areaA = await prisma.area.create({
    data: { name: "Area A — Distillation", plantId: plant1.id },
  });
  const areaB = await prisma.area.create({
    data: { name: "Area B — Storage Tank Farm", plantId: plant1.id },
  });
  const areaC = await prisma.area.create({
    data: { name: "Process Block 1", plantId: plant2.id },
  });
  const areaD = await prisma.area.create({
    data: { name: "Electrical Substation", plantId: plant2.id },
  });

  // Area owner owns Area A and Area B at Chennai
  await prisma.areaOwner.createMany({
    data: [
      { areaId: areaA.id, userId: areaOwner.id },
      { areaId: areaB.id, userId: areaOwner.id },
    ],
  });

  console.log("✓ Plants, areas, area ownership set");

  // ─── Equipment ────────────────────────────────────────────────────────────
  const equipList = await prisma.equipment.createManyAndReturn({
    data: [
      {
        tag: "CR-P-001",
        name: "Crude Distillation Pump",
        description: "Main transfer pump, Area A",
        areaId: areaA.id,
      },
      {
        tag: "CR-V-012",
        name: "Crude Distillation Column",
        description: "Atmospheric distillation tower",
        areaId: areaA.id,
      },
      {
        tag: "CR-TK-003",
        name: "Naphtha Storage Tank",
        description: "Floating roof, 5000 kL capacity",
        areaId: areaB.id,
      },
      {
        tag: "VZ-HX-001",
        name: "Process Heat Exchanger",
        description: "Shell-and-tube, Process Block 1",
        areaId: areaC.id,
      },
      {
        tag: "VZ-R-002",
        name: "Reactor Vessel R-200",
        description: "Fixed-bed catalytic reactor",
        areaId: areaC.id,
      },
      {
        tag: "VZ-ES-001",
        name: "Main Switchgear Panel",
        description: "11kV distribution panel",
        areaId: areaD.id,
      },
    ],
  });

  const [eq1, eq2, eq3, eq4, eq5, eq6] = equipList;
  console.log("✓ Equipment created");

  // ─── Helper: dates ────────────────────────────────────────────────────────
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000);
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);

  // ─── Permits ──────────────────────────────────────────────────────────────

  // 1. DRAFT — Hot Work
  const p1 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0001",
      type: "HOT_WORK",
      status: "DRAFT",
      requesterId: requester.id,
      contractorTeam: "Vijay Fabricators Pvt Ltd",
      workDescription: "Weld a new bracket on the outlet nozzle of CR-P-001 pump casing",
      plantId: plant1.id,
      areaId: areaA.id,
      equipmentId: eq1.id,
      locationDetail: "North side of pump plinth, near pipe rack 3",
      plannedStart: hoursFromNow(2),
      plannedEnd: hoursFromNow(10),
      expiresAt: hoursFromNow(10),
      hazardsIdentified: ["Open flame", "Flammable vapour", "Burns", "Eye injury"],
      ppeRequired: ["Welding shield", "Fire-resistant coverall", "Leather gloves", "Safety boots"],
      hotWorkDetails: {
        create: {
          hotWorkType: "welding",
          fireWatchAssigned: "Murugan K",
          extinguisherType: "CO2 9kg",
          combustiblesClearedM: 10,
          gasTestLel: 0,
          gasTestO2: 20.9,
          gasTestTime: hoursAgo(1),
          gasTestedBy: "Rajan Pillai",
        },
      },
    },
  });

  // 2. DRAFT — Confined Space
  await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0002",
      type: "CONFINED_SPACE",
      status: "DRAFT",
      requesterId: requester.id,
      contractorTeam: "SRM Maintenance Services",
      workDescription: "Internal inspection and cleaning of Naphtha storage tank CR-TK-003",
      plantId: plant1.id,
      areaId: areaB.id,
      equipmentId: eq3.id,
      locationDetail: "Tank top manway, east side",
      plannedStart: hoursFromNow(24),
      plannedEnd: hoursFromNow(32),
      expiresAt: hoursFromNow(32),
      hazardsIdentified: ["Oxygen deficiency", "Flammable vapour", "Falls", "Engulfment"],
      ppeRequired: ["SCBA", "Full body harness", "Non-sparking tools", "Intrinsically safe torch"],
      confinedSpaceDetails: {
        create: {
          spaceId: "CR-TK-003-INT",
          entryPoint: "Top manway (900mm dia)",
          atmTestO2: 20.8,
          atmTestLel: 0,
          atmTestH2s: 0,
          atmTestCo: 2,
          atmTestTime: hoursAgo(0.5),
          atmTestedBy: "Rajan Pillai",
          standbyAttendant: "Selvan R",
          rescuePlan: "Rescue tripod with 15m lifeline, trained rescue team on standby at entry",
          ventilationMethod: "Forced air blower (non-sparking), 30 min pre-entry + continuous",
          entryExitLog: [],
        },
      },
    },
  });

  // 3. PENDING_APPROVAL — Hot Work
  const p3 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0003",
      type: "HOT_WORK",
      status: "PENDING_APPROVAL",
      requesterId: requester.id,
      contractorTeam: "Vijay Fabricators Pvt Ltd",
      workDescription: "Cutting and removing old pipe spool on Distillation column CR-V-012",
      plantId: plant1.id,
      areaId: areaA.id,
      equipmentId: eq2.id,
      locationDetail: "Column base, south flange connection",
      plannedStart: hoursFromNow(4),
      plannedEnd: hoursFromNow(12),
      expiresAt: hoursFromNow(12),
      submittedAt: hoursAgo(1),
      hazardsIdentified: ["Open flame", "Sparks", "Hot metal", "Flammable residue"],
      ppeRequired: ["Welding shield", "Fire-resistant coverall", "Leather gloves"],
      hotWorkDetails: {
        create: {
          hotWorkType: "cutting",
          fireWatchAssigned: "Durai S",
          extinguisherType: "DCP 6kg + CO2 4.5kg",
          combustiblesClearedM: 10,
          gasTestLel: 0,
          gasTestO2: 20.9,
          gasTestTime: hoursAgo(1),
          gasTestedBy: "Rajan Pillai",
        },
      },
    },
  });

  // Area owner approval pending
  await prisma.permitApproval.create({
    data: {
      permitId: p3.id,
      approverId: areaOwner.id,
      role: "AREA_OWNER",
      status: "PENDING",
    },
  });
  await prisma.permitApproval.create({
    data: {
      permitId: p3.id,
      approverId: safetyOfficer.id,
      role: "SAFETY_OFFICER",
      status: "PENDING",
    },
  });
  await prisma.auditLog.create({
    data: {
      permitId: p3.id,
      actorId: requester.id,
      action: "SUBMITTED",
      fromStatus: "DRAFT",
      toStatus: "PENDING_APPROVAL",
      timestamp: hoursAgo(1),
    },
  });

  // 4. PENDING_APPROVAL — Working at Height
  const p4 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0004",
      type: "WORKING_AT_HEIGHT",
      status: "PENDING_APPROVAL",
      requesterId: requester.id,
      contractorTeam: "Apex Access Solutions",
      workDescription: "Replace platform handrail section on process column at 12m level",
      plantId: plant2.id,
      areaId: areaC.id,
      equipmentId: eq4.id,
      locationDetail: "VZ-HX-001 platform, 12m elevation, north access",
      plannedStart: hoursFromNow(6),
      plannedEnd: hoursFromNow(14),
      expiresAt: hoursFromNow(14),
      submittedAt: hoursAgo(2),
      hazardsIdentified: ["Fall from height", "Dropped objects", "Weather exposure"],
      ppeRequired: ["Full body harness", "Hard hat", "Safety boots", "High-visibility vest"],
      heightWorkDetails: {
        create: {
          heightMetres: 12,
          accessMethod: "scaffold",
          fallArrestEquip: "Full body harness EN361, lanyard with shock absorber",
          anchorChecked: true,
          barricadingBelow: true,
        },
      },
    },
  });

  await prisma.permitApproval.createMany({
    data: [
      { permitId: p4.id, approverId: safetyOfficer.id, role: "SAFETY_OFFICER", status: "APPROVED", decidedAt: hoursAgo(1) },
    ],
  });
  await prisma.auditLog.createMany({
    data: [
      { permitId: p4.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: hoursAgo(2) },
      { permitId: p4.id, actorId: safetyOfficer.id, action: "APPROVED", comment: "All safety measures look good. Waiting for area owner sign-off.", timestamp: hoursAgo(1) },
    ],
  });

  // 5. APPROVED — Electrical LOTO
  const p5 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0005",
      type: "ELECTRICAL_LOTO",
      status: "APPROVED",
      requesterId: requester.id,
      contractorTeam: "Powertech Electrical Services",
      workDescription: "Replace main circuit breaker in VZ-ES-001 switchgear panel",
      plantId: plant2.id,
      areaId: areaD.id,
      equipmentId: eq6.id,
      locationDetail: "11kV switchgear room, Bay 3",
      plannedStart: hoursAgo(0.5), // started 30 min ago — ready to activate
      plannedEnd: hoursFromNow(7),
      expiresAt: hoursFromNow(7),
      submittedAt: hoursAgo(6),
      hazardsIdentified: ["Electrocution", "Arc flash", "Burns"],
      ppeRequired: ["Arc flash suit 40cal/cm2", "Insulating gloves class 4", "Face shield", "Rubber mat"],
      electricalLotoDetails: {
        create: {
          equipmentTag: "VZ-ES-001-CB-B3",
          voltageLevel: "11kV",
          isolationPoints: [
            { point: "Incomer CB-B3 (11kV)", isolated: true },
            { point: "Bus coupler CB-BC1", isolated: true },
            { point: "Outgoing feeder F-31", isolated: true },
          ],
          lockNumbers: ["LOK-0041", "LOK-0042"],
          tagNumbers: ["TAG-2024-091", "TAG-2024-092"],
          earthingApplied: true,
          testedDeadBy: "Rajan Pillai",
        },
      },
    },
  });

  await prisma.permitApproval.createMany({
    data: [
      { permitId: p5.id, approverId: areaOwner.id, role: "AREA_OWNER", status: "APPROVED", decidedAt: hoursAgo(4), comment: "Isolation confirmed. Proceed." },
      { permitId: p5.id, approverId: safetyOfficer.id, role: "SAFETY_OFFICER", status: "APPROVED", decidedAt: hoursAgo(3), comment: "Earth tags applied, tested dead. Approved." },
    ],
  });
  await prisma.auditLog.createMany({
    data: [
      { permitId: p5.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: hoursAgo(6) },
      { permitId: p5.id, actorId: areaOwner.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", comment: "Isolation confirmed.", timestamp: hoursAgo(4) },
      { permitId: p5.id, actorId: safetyOfficer.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", comment: "Earth tags applied. Approved.", timestamp: hoursAgo(3) },
    ],
  });

  // 6. ACTIVE — Hot Work
  const p6 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0006",
      type: "HOT_WORK",
      status: "ACTIVE",
      requesterId: requester.id,
      contractorTeam: "Vijay Fabricators Pvt Ltd",
      workDescription: "Grinding of weld seams on pump outlet header CR-P-001",
      plantId: plant1.id,
      areaId: areaA.id,
      equipmentId: eq1.id,
      locationDetail: "Pump discharge header, ground level",
      plannedStart: hoursAgo(2),
      plannedEnd: hoursFromNow(1.5), // expiring in 1.5h — will show as "expiring soon"
      expiresAt: hoursFromNow(1.5),
      submittedAt: hoursAgo(5),
      activatedAt: hoursAgo(2),
      hazardsIdentified: ["Sparks", "Metal dust", "Eye injury"],
      ppeRequired: ["Grinding shield", "Hearing protection", "Leather gloves"],
      hotWorkDetails: {
        create: {
          hotWorkType: "grinding",
          fireWatchAssigned: "Murugan K",
          extinguisherType: "CO2 9kg",
          combustiblesClearedM: 10,
          gasTestLel: 0,
          gasTestO2: 20.9,
          gasTestTime: hoursAgo(2),
          gasTestedBy: "Rajan Pillai",
        },
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { permitId: p6.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: hoursAgo(5) },
      { permitId: p6.id, actorId: areaOwner.id, action: "APPROVED", timestamp: hoursAgo(4) },
      { permitId: p6.id, actorId: safetyOfficer.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", timestamp: hoursAgo(3) },
      { permitId: p6.id, actorId: safetyOfficer.id, action: "ACTIVATED", fromStatus: "APPROVED", toStatus: "ACTIVE", timestamp: hoursAgo(2) },
    ],
  });

  // 7. ACTIVE — Working at Height (expiring in 30 min — critical)
  const p7 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0007",
      type: "WORKING_AT_HEIGHT",
      status: "ACTIVE",
      requesterId: requester.id,
      contractorTeam: "Apex Access Solutions",
      workDescription: "Paint inspection of reactor vessel external surface at 8m level",
      plantId: plant2.id,
      areaId: areaC.id,
      equipmentId: eq5.id,
      locationDetail: "VZ-R-002, south side, 8m platform",
      plannedStart: hoursAgo(3),
      plannedEnd: hoursFromNow(0.5), // only 30 minutes left!
      expiresAt: hoursFromNow(0.5),
      submittedAt: hoursAgo(6),
      activatedAt: hoursAgo(3),
      hazardsIdentified: ["Fall from height", "Paint fumes"],
      ppeRequired: ["Full body harness", "Half-face respirator", "Safety boots"],
      heightWorkDetails: {
        create: {
          heightMetres: 8,
          accessMethod: "MEWP",
          fallArrestEquip: "Full body harness with twin-tail lanyard",
          anchorChecked: true,
          barricadingBelow: true,
        },
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { permitId: p7.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: hoursAgo(6) },
      { permitId: p7.id, actorId: safetyOfficer.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", timestamp: hoursAgo(4) },
      { permitId: p7.id, actorId: safetyOfficer.id, action: "ACTIVATED", fromStatus: "APPROVED", toStatus: "ACTIVE", timestamp: hoursAgo(3) },
    ],
  });

  // 8. SUSPENDED — Confined Space
  const p8 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0008",
      type: "CONFINED_SPACE",
      status: "SUSPENDED",
      requesterId: requester.id,
      contractorTeam: "SRM Maintenance Services",
      workDescription: "Inspection and repair of internal corrosion in heat exchanger shell",
      plantId: plant2.id,
      areaId: areaC.id,
      equipmentId: eq4.id,
      locationDetail: "VZ-HX-001 shell-side manway",
      plannedStart: hoursAgo(4),
      plannedEnd: hoursFromNow(4),
      expiresAt: hoursFromNow(4),
      submittedAt: hoursAgo(12),
      activatedAt: hoursAgo(4),
      suspendedAt: hoursAgo(2),
      hazardsIdentified: ["Oxygen deficiency", "Chemical exposure", "Limited visibility"],
      ppeRequired: ["SCBA", "Chemical suit", "Lifeline harness"],
      confinedSpaceDetails: {
        create: {
          spaceId: "VZ-HX-001-SHELL",
          entryPoint: "Shell-side manway (600mm dia)",
          atmTestO2: 20.5,
          atmTestLel: 0,
          atmTestH2s: 1,
          atmTestCo: 5,
          atmTestTime: hoursAgo(4),
          atmTestedBy: "Rajan Pillai",
          standbyAttendant: "Kumar V",
          rescuePlan: "Rescue tripod, emergency response team notified",
          ventilationMethod: "Forced air blower + natural ventilation",
          entryExitLog: [
            { name: "Senthil Kumar", entryTime: hoursAgo(3.5).toISOString(), exitTime: hoursAgo(2).toISOString() },
          ],
        },
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { permitId: p8.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: hoursAgo(12) },
      { permitId: p8.id, actorId: safetyOfficer.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", timestamp: hoursAgo(8) },
      { permitId: p8.id, actorId: safetyOfficer.id, action: "ACTIVATED", fromStatus: "APPROVED", toStatus: "ACTIVE", timestamp: hoursAgo(4) },
      { permitId: p8.id, actorId: safetyOfficer.id, action: "SUSPENDED", fromStatus: "ACTIVE", toStatus: "SUSPENDED", comment: "H2S level elevated above safe threshold. Work stopped immediately.", timestamp: hoursAgo(2) },
    ],
  });

  // 9. CLOSED — Electrical LOTO (waiting for safety officer to verify)
  const p9 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0009",
      type: "ELECTRICAL_LOTO",
      status: "CLOSED",
      requesterId: requester.id,
      contractorTeam: "Powertech Electrical Services",
      workDescription: "Maintenance of distribution panel feeder relay F-22",
      plantId: plant2.id,
      areaId: areaD.id,
      equipmentId: eq6.id,
      locationDetail: "11kV switchgear room, Bay 2",
      plannedStart: daysAgo(1),
      plannedEnd: new Date(daysAgo(1).getTime() + 8 * 3600_000),
      expiresAt: new Date(daysAgo(1).getTime() + 8 * 3600_000),
      submittedAt: new Date(daysAgo(2).getTime()),
      activatedAt: daysAgo(1),
      closedAt: new Date(daysAgo(1).getTime() + 7 * 3600_000),
      closureNotes: "Work complete. All locks removed. Panel energised and tested. Feeder relay calibrated.",
      hazardsIdentified: ["Electrocution", "Arc flash"],
      ppeRequired: ["Arc flash suit", "Insulating gloves"],
      electricalLotoDetails: {
        create: {
          equipmentTag: "VZ-ES-001-CB-B2",
          voltageLevel: "11kV",
          isolationPoints: [
            { point: "Incomer CB-B2", isolated: true },
            { point: "Feeder F-22", isolated: true },
          ],
          lockNumbers: ["LOK-0038"],
          tagNumbers: ["TAG-2024-087"],
          earthingApplied: true,
          testedDeadBy: "Rajan Pillai",
        },
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { permitId: p9.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: daysAgo(2) },
      { permitId: p9.id, actorId: safetyOfficer.id, action: "APPROVED", fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", timestamp: new Date(daysAgo(2).getTime() + 2 * 3600_000) },
      { permitId: p9.id, actorId: safetyOfficer.id, action: "ACTIVATED", fromStatus: "APPROVED", toStatus: "ACTIVE", timestamp: daysAgo(1) },
      { permitId: p9.id, actorId: requester.id, action: "CLOSED", fromStatus: "ACTIVE", toStatus: "CLOSED", comment: "All work complete, equipment safe to re-energise.", timestamp: new Date(daysAgo(1).getTime() + 7 * 3600_000) },
    ],
  });

  // 10. REJECTED — Confined Space
  const p10 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-2024-0010",
      type: "CONFINED_SPACE",
      status: "REJECTED",
      requesterId: requester.id,
      contractorTeam: "SRM Maintenance Services",
      workDescription: "Cleaning of reactor sump VZ-R-002",
      plantId: plant2.id,
      areaId: areaC.id,
      equipmentId: eq5.id,
      locationDetail: "Reactor sump, lower access hatch",
      plannedStart: daysAgo(3),
      plannedEnd: new Date(daysAgo(3).getTime() + 6 * 3600_000),
      expiresAt: new Date(daysAgo(3).getTime() + 6 * 3600_000),
      submittedAt: daysAgo(4),
      rejectedAt: new Date(daysAgo(4).getTime() + 3 * 3600_000),
      hazardsIdentified: ["Toxic vapour", "Oxygen deficiency", "Engulfment risk"],
      ppeRequired: ["SCBA", "Chemical resistant suit"],
      confinedSpaceDetails: {
        create: {
          spaceId: "VZ-R-002-SUMP",
          entryPoint: "Lower access hatch (500mm dia)",
          atmTestO2: 19.2,
          atmTestLel: 15,
          atmTestH2s: 8,
          atmTestCo: 20,
          atmTestTime: daysAgo(4),
          atmTestedBy: "Rajan Pillai",
          standbyAttendant: "Not assigned",
          rescuePlan: "Not specified",
          ventilationMethod: "Natural ventilation only",
          entryExitLog: [],
        },
      },
    },
  });

  await prisma.permitApproval.create({
    data: {
      permitId: p10.id,
      approverId: safetyOfficer.id,
      role: "SAFETY_OFFICER",
      status: "REJECTED",
      comment: "REJECTED: LEL reading at 15% is dangerously high. Natural ventilation alone is insufficient. No standby attendant assigned, no rescue plan provided. Resubmit only after proper ventilation and full rescue plan.",
      decidedAt: new Date(daysAgo(4).getTime() + 3 * 3600_000),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { permitId: p10.id, actorId: requester.id, action: "SUBMITTED", fromStatus: "DRAFT", toStatus: "PENDING_APPROVAL", timestamp: daysAgo(4) },
      { permitId: p10.id, actorId: safetyOfficer.id, action: "REJECTED", fromStatus: "PENDING_APPROVAL", toStatus: "REJECTED", comment: "LEL 15%, no standby attendant, no rescue plan. Reject.", timestamp: new Date(daysAgo(4).getTime() + 3 * 3600_000) },
    ],
  });

  console.log("✓ 10 permits created across all statuses and types");
  console.log("\n✅ Seed complete.");
  console.log("\nDemo credentials:");
  console.log("  requester@ptw.dev  / password123  (REQUESTER)");
  console.log("  areaowner@ptw.dev  / password123  (AREA_OWNER — Area A & B, Chennai)");
  console.log("  safety@ptw.dev     / password123  (SAFETY_OFFICER)");
  console.log("  admin@ptw.dev      / password123  (ADMIN)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
