import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, canActorApprove, PermitTransitionError } from "@/lib/permit-state-machine";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(10, "Rejection reason must be at least 10 characters."),
});

// POST /api/permits/[id]/reject
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { approvals: true },
  });
  if (!permit) return notFound("Permit not found.");

  const actorForSM = {
    id: user.id,
    role: user.role as any,
    ownedAreaIds: user.ownedAreaIds,
  };

  const canApprove = canActorApprove(
    {
      id: permit.id,
      status: permit.status,
      requesterId: permit.requesterId,
      areaId: permit.areaId,
      plannedStart: permit.plannedStart,
      plannedEnd: permit.plannedEnd,
      expiresAt: permit.expiresAt,
    },
    actorForSM
  );

  if (!canApprove.allowed) {
    return NextResponse.json({ error: canApprove.reason }, { status: 403 });
  }

  const myApproval = permit.approvals.find(
    (a) => a.approverId === user.id && a.status === "PENDING"
  );
  if (!myApproval) {
    return NextResponse.json(
      { error: "No pending approval slot found for you on this permit." },
      { status: 400 }
    );
  }

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
      "REJECT",
      actorForSM
    );

    await prisma.$transaction(async (tx) => {
      await tx.permitApproval.update({
        where: { id: myApproval.id },
        data: { status: "REJECTED", comment: parsed.data.reason, decidedAt: new Date() },
      });
      await tx.permit.update({
        where: { id: permit.id },
        data: { status: newStatus, rejectedAt: new Date() },
      });
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "REJECTED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment: parsed.data.reason,
    });

    notifyUser(permit.requesterId, `Your permit ${permit.permitNumber} has been rejected. Reason: ${parsed.data.reason}`);

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[reject]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
