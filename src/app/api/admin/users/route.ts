import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized, forbidden } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { z } from "zod";

// GET /api/admin/users — list all users (admin only)
export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["REQUESTER", "AREA_OWNER", "SAFETY_OFFICER", "ADMIN"]),
  areaIds: z.array(z.string()).optional(),
});

// POST /api/admin/users — create user (admin only)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      ...(parsed.data.role === "AREA_OWNER" && parsed.data.areaIds?.length
        ? {
            ownedAreas: {
              create: parsed.data.areaIds.map((areaId) => ({ areaId })),
            },
          }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}
