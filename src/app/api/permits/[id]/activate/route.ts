import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";

// POST /api/permits/[id]/activate
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const permit = await prisma.permit.findUnique({ where: { id: params.id } });
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
      "ACTIVATE",
      { id: user.id, role: user.role as any }
    );

    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: newStatus, activatedAt: new Date() },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "ACTIVATED",
      fromStatus: permit.status,
      toStatus: newStatus,
    });

    notifyUser(permit.requesterId, `Permit ${permit.permitNumber} is now ACTIVE. Work may begin.`);

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[activate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
