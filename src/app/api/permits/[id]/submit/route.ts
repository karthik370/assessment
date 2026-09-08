import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";

// POST /api/permits/[id]/submit
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { area: { include: { owners: { include: { user: true } } } } },
  });
  if (!permit) return notFound("Permit not found.");

  try {
    const newStatus = transition(
      {
        id: permit.id,
        status: permit.status,
        requesterId: permit.requesterId,
        areaId: permit.areaId,
        plannedStart: permit.plannedStart,
        plannedEnd: permit.plannedEnd,
        expiresAt: permit.expiresAt,
      },
      "SUBMIT",
      { id: user.id, role: user.role as any }
    );

    // Create approval slots for all area owners + the safety officer
    const areaOwnerIds = permit.area.owners.map((o) => o.userId);
    const safetyOfficers = await prisma.user.findMany({
      where: { role: "SAFETY_OFFICER" },
    });

    await prisma.$transaction(async (tx) => {
      await tx.permit.update({
        where: { id: permit.id },
        data: { status: newStatus, submittedAt: new Date() },
      });

      // Create pending approval records
      await tx.permitApproval.createMany({
        data: [
          ...areaOwnerIds.map((aoId) => ({
            permitId: permit.id,
            approverId: aoId,
            role: "AREA_OWNER" as const,
            status: "PENDING" as const,
          })),
          ...safetyOfficers.map((so) => ({
            permitId: permit.id,
            approverId: so.id,
            role: "SAFETY_OFFICER" as const,
            status: "PENDING" as const,
          })),
        ],
        skipDuplicates: true,
      });
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "SUBMITTED",
      fromStatus: permit.status,
      toStatus: newStatus,
    });

    // Stub notifications
    [...areaOwnerIds, ...safetyOfficers.map((s) => s.id)].forEach((uid) => {
      notifyUser(uid, `Permit ${permit.permitNumber} requires your approval.`);
    });

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
