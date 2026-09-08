import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, notFound, writeAuditLog, notifyUser } from "@/lib/api-helpers";
import { transition, PermitTransitionError } from "@/lib/permit-state-machine";
import { z } from "zod";

const closeSchema = z.object({
  closureNotes: z.string().min(10, "Please provide closure notes (min 10 characters)."),
});

// POST /api/permits/[id]/close
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

  const parsed = closeSchema.safeParse(body);
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
      "CLOSE",
      { id: user.id, role: user.role as any }
    );

    await prisma.permit.update({
      where: { id: permit.id },
      data: {
        status: newStatus,
        closedAt: new Date(),
        closureNotes: parsed.data.closureNotes,
      },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: user.id,
      action: "CLOSED",
      fromStatus: permit.status,
      toStatus: newStatus,
      comment: parsed.data.closureNotes,
    });

    // Notify safety officers to come verify
    const safetyOfficers = await prisma.user.findMany({ where: { role: "SAFETY_OFFICER" } });
    safetyOfficers.forEach((so) => {
      notifyUser(so.id, `Permit ${permit.permitNumber} is closed and ready for your site verification.`);
    });

    return NextResponse.json({ status: newStatus });
  } catch (err) {
    if (err instanceof PermitTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[close]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
