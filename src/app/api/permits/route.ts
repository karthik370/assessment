import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  generatePermitNumber,
  writeAuditLog,
} from "@/lib/api-helpers";
import { z } from "zod";

// GET /api/permits — list with filters
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const areaId = searchParams.get("areaId");
  const myPending = searchParams.get("myPending") === "true";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (areaId) where.areaId = areaId;
  if (dateFrom || dateTo) {
    where.plannedStart = {};
    if (dateFrom) where.plannedStart.gte = new Date(dateFrom);
    if (dateTo) where.plannedStart.lte = new Date(dateTo);
  }

  // "My approvals pending" — permits in PENDING_APPROVAL where this user has a pending approval
  if (myPending) {
    where.status = "PENDING_APPROVAL";
    where.approvals = {
      some: {
        approverId: user.id,
        status: "PENDING",
      },
    };
  }

  const permits = await prisma.permit.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      plant: { select: { id: true, name: true, code: true } },
      area: { select: { id: true, name: true } },
      equipment: { select: { id: true, tag: true, name: true } },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, role: true } },
        },
      },
      _count: { select: { auditLogs: true } },
    },
  });

  return NextResponse.json({ permits });
}

// POST /api/permits — create a new permit (always starts as DRAFT)
const createPermitSchema = z.object({
  type: z.enum(["HOT_WORK", "CONFINED_SPACE", "WORKING_AT_HEIGHT", "ELECTRICAL_LOTO"]),
  contractorTeam: z.string().min(1),
  workDescription: z.string().min(10),
  plantId: z.string(),
  areaId: z.string(),
  equipmentId: z.string().optional(),
  locationDetail: z.string().min(5),
  plannedStart: z.string().datetime(),
  plannedEnd: z.string().datetime(),
  hazardsIdentified: z.array(z.string()).default([]),
  ppeRequired: z.array(z.string()).default([]),
  // type-specific fields are optional at create time (saved as draft)
  hotWork: z.object({
    hotWorkType: z.string(),
    fireWatchAssigned: z.string(),
    extinguisherType: z.string(),
    combustiblesClearedM: z.number(),
    gasTestLel: z.number(),
    gasTestO2: z.number(),
    gasTestTime: z.string().datetime(),
    gasTestedBy: z.string(),
  }).optional(),
  confinedSpace: z.object({
    spaceId: z.string(),
    entryPoint: z.string(),
    atmTestO2: z.number(),
    atmTestLel: z.number(),
    atmTestH2s: z.number(),
    atmTestCo: z.number(),
    atmTestTime: z.string().datetime(),
    atmTestedBy: z.string(),
    standbyAttendant: z.string(),
    rescuePlan: z.string(),
    ventilationMethod: z.string(),
  }).optional(),
  heightWork: z.object({
    heightMetres: z.number().positive(),
    accessMethod: z.string(),
    fallArrestEquip: z.string(),
    anchorChecked: z.boolean(),
    barricadingBelow: z.boolean(),
  }).optional(),
  electricalLoto: z.object({
    equipmentTag: z.string(),
    voltageLevel: z.string(),
    isolationPoints: z.array(z.object({ point: z.string(), isolated: z.boolean() })),
    lockNumbers: z.array(z.string()),
    tagNumbers: z.array(z.string()),
    earthingApplied: z.boolean(),
    testedDeadBy: z.string(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = createPermitSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const data = parsed.data;

  // Validate dates
  const start = new Date(data.plannedStart);
  const end = new Date(data.plannedEnd);
  if (end <= start) {
    return badRequest("Planned end must be after planned start.");
  }

  try {
    const permitNumber = await generatePermitNumber();

    // Check for conflicts before creating (hot work + confined space in same area/time)
    if (data.type === "HOT_WORK") {
      const conflicts = await prisma.permit.findMany({
        where: {
          areaId: data.areaId,
          type: "CONFINED_SPACE",
          status: { in: ["APPROVED", "ACTIVE"] },
          plannedStart: { lt: end },
          plannedEnd: { gt: start },
        },
        select: { permitNumber: true },
      });
      if (conflicts.length > 0) {
        // We warn but don't block — the response includes a warning field
        // (blocking would prevent the permit being raised at all, which is wrong;
        //  the area owner/safety officer should make that call)
        return NextResponse.json(
          {
            warning: `Conflict detected: permits ${conflicts.map((c) => c.permitNumber).join(", ")} are CONFINED SPACE permits active/approved in the same area during this time window. Review before proceeding.`,
            conflicts: conflicts.map((c) => c.permitNumber),
          },
          { status: 409 }
        );
      }
    }

    const permit = await prisma.permit.create({
      data: {
        permitNumber,
        type: data.type,
        status: "DRAFT",
        requesterId: user.id,
        contractorTeam: data.contractorTeam,
        workDescription: data.workDescription,
        plantId: data.plantId,
        areaId: data.areaId,
        equipmentId: data.equipmentId,
        locationDetail: data.locationDetail,
        plannedStart: start,
        plannedEnd: end,
        expiresAt: end,
        hazardsIdentified: data.hazardsIdentified,
        ppeRequired: data.ppeRequired,
        hotWorkDetails: data.hotWork ? { create: { ...data.hotWork, gasTestTime: new Date(data.hotWork.gasTestTime) } } : undefined,
        confinedSpaceDetails: data.confinedSpace
          ? { create: { ...data.confinedSpace, atmTestTime: new Date(data.confinedSpace.atmTestTime), entryExitLog: [] } }
          : undefined,
        heightWorkDetails: data.heightWork ? { create: data.heightWork } : undefined,
        electricalLotoDetails: data.electricalLoto
          ? { create: { ...data.electricalLoto, isolationPoints: data.electricalLoto.isolationPoints } }
          : undefined,
      },
      include: { requester: { select: { id: true, name: true } } },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "CREATED",
      toStatus: "DRAFT",
      comment: `Permit ${permitNumber} created as DRAFT`,
    });

    return NextResponse.json({ permit }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/permits]", err);
    return serverError();
  }
}
