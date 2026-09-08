import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized } from "@/lib/api-helpers";

// GET /api/admin/plants-areas — returns plant and area hierarchy for select inputs
export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const plants = await prisma.plant.findMany({
    include: {
      areas: {
        include: {
          equipment: { select: { id: true, tag: true, name: true } },
          owners: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ plants });
}
