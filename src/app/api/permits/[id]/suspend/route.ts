import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";
import { z } from "zod";

// POST /api/permits/[id]/suspend
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const permit = await prisma.permit.findUnique({ where: { id: (await params).id } });
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
      "SUSPEND",
      { id: user.id, role: user.role as any }
    );

    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: newStatus, suspendedAt: new Date() },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "SUSPENDED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment: reason || "Work suspended by safety officer.",
    });

    notifyUser(permit.requesterId, `URGENT: Permit ${permit.permitNumber} has been SUSPENDED. All work must stop immediately.`);

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
