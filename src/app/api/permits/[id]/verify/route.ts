import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";
import { z } from "zod";

const verifySchema = z.object({
  verifiedNotes: z.string().min(5, "Please provide site verification notes."),
});

// POST /api/permits/[id]/verify
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

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

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
      "VERIFY",
      { id: user.id, role: user.role as any }
    );

    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: newStatus, verifiedAt: new Date(), verifiedNotes: parsed.data.verifiedNotes },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "VERIFIED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment: parsed.data.verifiedNotes,
    });

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
