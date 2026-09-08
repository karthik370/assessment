// Utility functions for API routes — session extraction, error responses, audit logging

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { PermitStatus } from "@prisma/client";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id as string,
    name: session.user.name as string,
    role: (session.user as any).role as string,
    ownedAreaIds: ((session.user as any).ownedAreaIds ?? []) as string[],
  };
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// Write an immutable audit log entry.
// Never throws — if logging fails we don't want to roll back the actual action.
export async function writeAuditLog({
  permitId,
  actorId,
  action,
  fromStatus,
  toStatus,
  fieldName,
  oldValue,
  newValue,
  comment,
}: {
  permitId: string;
  actorId: string;
  action: string;
  fromStatus?: PermitStatus;
  toStatus?: PermitStatus;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        permitId,
        actorId,
        action,
        fromStatus,
        toStatus,
        fieldName,
        oldValue,
        newValue,
        comment,
      },
    });
  } catch (err) {
    console.error("[audit-log] Failed to write audit entry:", err);
  }
}

// Generate a permit number like PTW-2024-0042
export async function generatePermitNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.permit.count();
  const seq = String(count + 1).padStart(4, "0");
  return `PTW-${year}-${seq}`;
}

// Stub notification — logs what would be sent in production
export function notifyUser(userId: string, message: string) {
  console.log(`[NOTIFY] Would notify user ${userId}: ${message}`);
}
