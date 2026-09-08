import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-helpers";

// GET /api/permits/[id] — full permit detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const permit = await prisma.permit.findUnique({
    where: { id: (await params).id },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
      plant: true,
      area: true,
      equipment: true,
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
        orderBy: { timestamp: "asc" },
      },
      hotWorkDetails: true,
      confinedSpaceDetails: true,
      heightWorkDetails: true,
      electricalLotoDetails: true,
      extensionRequests: {
        include: {
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!permit) return notFound("Permit not found.");

  return NextResponse.json({ permit });
}

// PATCH /api/permits/[id] — update draft permit fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const permit = await prisma.permit.findUnique({
    where: { id: (await params).id },
  });
  if (!permit) return notFound("Permit not found.");

  // Only DRAFT permits can be edited
  if (permit.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT permits can be edited. This permit is in " + permit.status + " state." },
      { status: 400 }
    );
  }

  // Only the requester or admin can edit
  if (permit.requesterId !== user.id && user.role !== "ADMIN") {
    return forbidden("Only the permit requester or an Admin can edit this permit.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Update only provided fields (partial update)
  const allowedFields = [
    "contractorTeam", "workDescription", "plantId", "areaId",
    "equipmentId", "locationDetail", "plannedStart", "plannedEnd",
    "hazardsIdentified", "ppeRequired",
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (body.plannedStart) updateData.plannedStart = new Date(body.plannedStart);
  if (body.plannedEnd) {
    updateData.plannedEnd = new Date(body.plannedEnd);
    updateData.expiresAt = new Date(body.plannedEnd);
  }

  try {
    const updated = await prisma.permit.update({
      where: { id: (await params).id },
      data: updateData,
    });
    return NextResponse.json({ permit: updated });
  } catch (err) {
    console.error("[PATCH /api/permits/[id]]", err);
    return serverError();
  }
}
