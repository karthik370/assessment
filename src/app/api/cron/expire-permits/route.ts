import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/api-helpers";

// GET /api/cron/expire-permits
// This route is called by Vercel Cron (see vercel.json) every 5 minutes.
// It finds all permits whose expiresAt has passed and marks them EXPIRED.
// Protected by CRON_SECRET — requests without it get 401.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, Vercel adds the Authorization header automatically.
  // We check it here so random people can't call this endpoint.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all permits that should be expired
  const toExpire = await prisma.permit.findMany({
    where: {
      status: { in: ["ACTIVE", "APPROVED", "SUSPENDED"] },
      expiresAt: { lt: now },
    },
    select: { id: true, permitNumber: true, status: true, requesterId: true },
  });

  if (toExpire.length === 0) {
    return NextResponse.json({ expired: 0, message: "No permits to expire." });
  }

  // Get a system user for audit logs (admin user)
  const systemUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!systemUser) {
    return NextResponse.json({ error: "No admin user found for audit logging." }, { status: 500 });
  }

  const results: string[] = [];

  for (const permit of toExpire) {
    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: "EXPIRED" },
    });

    await writeAuditLog({
      permitId: permit.id,
      actorId: systemUser.id,
      action: "AUTO_EXPIRED",
      fromStatus: permit.status,
      toStatus: "EXPIRED",
      comment: `Permit automatically expired at ${now.toISOString()}`,
    });

    results.push(permit.permitNumber);
    console.log(`[cron] Expired permit ${permit.permitNumber}`);
  }

  return NextResponse.json({
    expired: results.length,
    permits: results,
    timestamp: now.toISOString(),
  });
}
