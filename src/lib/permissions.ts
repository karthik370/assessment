// Role-based permission checks.
// Keep this a pure module — no DB, no HTTP, just logic.
// API routes call these after fetching the actor from session.

import { Role, PermitStatus } from "@prisma/client";

export interface PermissionActor {
  id: string;
  role: Role;
  ownedAreaIds?: string[];
}

export interface PermissionContext {
  permitRequesterId?: string;
  permitAreaId?: string;
  permitStatus?: PermitStatus;
}

// Check if an actor can create a permit at all
export function canCreatePermit(actor: PermissionActor): boolean {
  // Everyone can create
  return true;
}

// Check if an actor can view a permit (for now everyone authenticated can)
export function canViewPermit(_actor: PermissionActor): boolean {
  return true;
}

// Check if an actor can edit a DRAFT permit
export function canEditDraftPermit(
  actor: PermissionActor,
  ctx: PermissionContext
): boolean {
  if (actor.role === "ADMIN") return true;
  return actor.id === ctx.permitRequesterId;
}

// Check if an actor can approve a permit (doesn't check area ownership — that's done in state machine)
export function canApprovePermit(
  actor: PermissionActor,
  ctx: PermissionContext
): { allowed: boolean; reason?: string } {
  if (actor.role === "REQUESTER") {
    return { allowed: false, reason: "Requesters cannot approve permits." };
  }
  if (actor.id === ctx.permitRequesterId) {
    return { allowed: false, reason: "You cannot approve your own permit." };
  }
  if (actor.role === "AREA_OWNER") {
    if (!actor.ownedAreaIds?.includes(ctx.permitAreaId!)) {
      return {
        allowed: false,
        reason: "You can only approve permits in your assigned areas.",
      };
    }
  }
  return { allowed: true };
}

// Check if the actor can manage users and areas
export function canManageSystem(actor: PermissionActor): boolean {
  return actor.role === "ADMIN";
}

// Returns the set of actions visible to this actor in this context
export function getAvailableActions(
  actor: PermissionActor,
  ctx: PermissionContext & { expiresAt?: Date | null }
): string[] {
  const actions: string[] = [];
  const { permitStatus, permitRequesterId, permitAreaId } = ctx;

  if (!permitStatus) return actions;

  const isOwner = actor.id === permitRequesterId;
  const isAreaOwner =
    actor.role === "AREA_OWNER" &&
    actor.ownedAreaIds?.includes(permitAreaId ?? "");
  const isSafetyOrAdmin =
    actor.role === "SAFETY_OFFICER" || actor.role === "ADMIN";

  switch (permitStatus) {
    case "DRAFT":
      if (isOwner || actor.role === "ADMIN") {
        actions.push("EDIT", "SUBMIT", "CANCEL");
      }
      break;

    case "PENDING_APPROVAL":
      if (isOwner && actor.role !== "SAFETY_OFFICER" && actor.role !== "AREA_OWNER") {
        actions.push("CANCEL");
      }
      if (isSafetyOrAdmin && !isOwner) {
        actions.push("APPROVE", "REJECT", "CANCEL");
      }
      if (isAreaOwner && !isOwner) {
        actions.push("APPROVE", "REJECT");
      }
      break;

    case "APPROVED":
      if (isSafetyOrAdmin) {
        actions.push("ACTIVATE", "CANCEL");
      }
      // Extension request is available to requester
      if (isOwner) {
        actions.push("REQUEST_EXTENSION");
      }
      break;

    case "ACTIVE":
      if (isSafetyOrAdmin) {
        actions.push("SUSPEND", "CANCEL");
      }
      if (isOwner || isSafetyOrAdmin) {
        actions.push("CLOSE");
      }
      if (isOwner) {
        actions.push("REQUEST_EXTENSION");
      }
      break;

    case "SUSPENDED":
      if (isSafetyOrAdmin) {
        actions.push("RESUME", "CANCEL");
      }
      break;

    case "CLOSED":
      if (isSafetyOrAdmin) {
        actions.push("VERIFY");
      }
      break;

    default:
      // Terminal states: no actions
      break;
  }

  // Deduplicate
  return [...new Set(actions)];
}
