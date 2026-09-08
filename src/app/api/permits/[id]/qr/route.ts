import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";

// GET /api/permits/[id]/qr — returns a QR code PNG pointing to the permit detail page
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const permit = await prisma.permit.findUnique({
    where: { id: params.id },
    select: { id: true, permitNumber: true },
  });

  if (!permit) {
    return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  }

  // The QR code links to the permit detail page — a safety officer scanning
  // with their phone during a walk-around will land directly on the permit.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
  const permitUrl = `${baseUrl}/permits/${permit.id}`;

  const qrPng = await QRCode.toBuffer(permitUrl, {
    type: "png",
    width: 300,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  const arrayBuf = qrPng.buffer.slice(
    qrPng.byteOffset,
    qrPng.byteOffset + qrPng.byteLength
  ) as ArrayBuffer;

  return new NextResponse(arrayBuf, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
