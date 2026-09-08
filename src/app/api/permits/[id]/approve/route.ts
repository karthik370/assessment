import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, canActorApprove, PermitTransitionError } from "@/lib/permit-state-machine";

// POST /api/permits/[id]/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { comment } = await req.json().catch(() => ({ comment: undefined }));

  const permit = await prisma.permit.findUnique({
    where: { id: (await params).id },
    include: {
      approvals: true,
      requester: { select: { id: true, name: true } },
    },
  });
  if (!permit) return notFound("Permit not found.");

  // Check actor is allowed to approve (area scope check)
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

  // Find the approval slot for this user
  const myApproval = permit.approvals.find(
    (a) => a.approverId === user.id && a.status === "PENDING"
  );
  if (!myApproval) {
    return NextResponse.json(
      { error: "No pending approval slot found for you on this permit." },
      { status: 400 }
    );
  }

  // Project what the approval state will be after this approval
  const approvedAfterThis = permit.approvals.map((a) =>
    a.id === myApproval.id ? { ...a, status: "APPROVED" } : a
  );

  const areaOwnerApproved = approvedAfterThis.some(
    (a) => a.role === "AREA_OWNER" && a.status === "APPROVED"
  );
  const safetyOfficerApproved = approvedAfterThis.some(
    (a) => a.role === "SAFETY_OFFICER" && a.status === "APPROVED"
  );

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
      "APPROVE",
      actorForSM,
      { areaOwnerApproved, safetyOfficerApproved }
    );

    await prisma.$transaction(async (tx) => {
      // Record this approver's decision
      await tx.permitApproval.update({
        where: { id: myApproval.id },
        data: {
          status: "APPROVED",
          comment,
          decidedAt: new Date(),
        },
      });

      // Update permit status
      await tx.permit.update({
        where: { id: permit.id },
        data: { status: newStatus },
      });
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "APPROVED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment,
    });

    if (newStatus === "APPROVED") {
      notifyUser(permit.requesterId, `Your permit ${permit.permitNumber} has been fully approved and is ready to activate.`);
    }

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[approve]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
