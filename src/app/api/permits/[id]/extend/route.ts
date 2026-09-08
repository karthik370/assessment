import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { z } from "zod";

const MAX_EXTENSION_HOURS = 8;
const MAX_EXTENSIONS_PER_PERMIT = 1;

const extendSchema = z.object({
  requestedHours: z.number().int().min(1).max(MAX_EXTENSION_HOURS),
  reason: z.string().min(10),
});

// POST /api/permits/[id]/extend — requester requests extension
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

  const parsed = extendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    include: { extensionRequests: true },
  });
  if (!permit) return notFound("Permit not found.");

  // Only ACTIVE or APPROVED permits can request extension
  if (permit.status !== "ACTIVE" && permit.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Extensions can only be requested for ACTIVE or APPROVED permits." },
      { status: 400 }
    );
  }

  // Requester can only extend their own permit (or admin)
  if (permit.requesterId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the permit requester can request an extension." },
      { status: 403 }
    );
  }

  // Cap: 1 extension per permit
  const approvedExtensions = permit.extensionRequests.filter(
    (e) => e.status === "APPROVED"
  );
  if (approvedExtensions.length >= MAX_EXTENSIONS_PER_PERMIT) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_EXTENSIONS_PER_PERMIT} extension(s) allowed per permit. A new permit must be raised.` },
      { status: 400 }
    );
  }

  const pendingExtension = permit.extensionRequests.find(
    (e) => e.status === "PENDING"
  );
  if (pendingExtension) {
    return NextResponse.json(
      { error: "There is already a pending extension request for this permit." },
      { status: 400 }
    );
  }

  const extension = await prisma.extensionRequest.create({
    data: {
      permitId: permit.id,
      requesterId: user.id,
      requestedHours: parsed.data.requestedHours,
      reason: parsed.data.reason,
      status: "PENDING",
    },
  });

  await writeAuditLog({
    permitId: permit.id,
    actorId: user.id,
    action: "EXTENSION_REQUESTED",
    comment: `Requested +${parsed.data.requestedHours}h. Reason: ${parsed.data.reason}`,
  });

  // Notify safety officers
  const safetyOfficers = await prisma.user.findMany({ where: { role: "SAFETY_OFFICER" } });
  safetyOfficers.forEach((so) => {
    notifyUser(so.id, `Extension request for permit ${permit.permitNumber}: +${parsed.data.requestedHours} hours. Requires your approval.`);
  });

  return NextResponse.json({ extension }, { status: 201 });
}

// PATCH /api/permits/[id]/extend — safety officer approves or rejects extension
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (user.role !== "SAFETY_OFFICER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only Safety Officers or Admins can approve extension requests." },
      { status: 403 }
    );
  }

  const { extensionId, approved, comment } = await req.json().catch(() => ({}));

  if (!extensionId || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "extensionId and approved (boolean) are required." },
      { status: 400 }
    );
  }

  const extension = await prisma.extensionRequest.findUnique({
    where: { id: extensionId },
    include: { permit: true },
  });

  if (!extension || extension.permitId !== params.id) {
    return notFound("Extension request not found.");
  }

  if (extension.status !== "PENDING") {
    return NextResponse.json(
      { error: "This extension request has already been decided." },
      { status: 400 }
    );
  }

  const newExtStatus = approved ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.extensionRequest.update({
      where: { id: extensionId },
      data: {
        status: newExtStatus,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });

    if (approved) {
      const newExpiry = new Date(
        extension.permit.expiresAt!.getTime() +
          extension.requestedHours * 3600_000
      );
      await tx.permit.update({
        where: { id: extension.permitId },
        data: { plannedEnd: newExpiry, expiresAt: newExpiry },
      });
    }
  });

  await writeAuditLog({
    permitId: extension.permitId,
    actorId: user.id,
    action: approved ? "EXTENSION_APPROVED" : "EXTENSION_REJECTED",
    comment: approved
      ? `Extension of +${extension.requestedHours}h approved. ${comment ?? ""}`
      : `Extension rejected. ${comment ?? ""}`,
  });

  notifyUser(
    extension.requesterId,
    approved
      ? `Your extension request for permit ${extension.permit.permitNumber} has been approved (+${extension.requestedHours}h).`
      : `Your extension request for permit ${extension.permit.permitNumber} has been rejected.`
  );

  return NextResponse.json({ status: newExtStatus });
}
