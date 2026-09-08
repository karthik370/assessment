import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";

// POST /api/permits/[id]/resume
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { comment } = await req.json().catch(() => ({ comment: "" }));

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
      "RESUME",
      { id: user.id, role: user.role as any }
    );

    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: newStatus, suspendedAt: null },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "RESUMED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment: comment || "Work resumed.",
    });

    notifyUser(permit.requesterId, `Permit ${permit.permitNumber} has been RESUMED. Work may continue.`);

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
