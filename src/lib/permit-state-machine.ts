// State machine for Permit to Work lifecycle.
// Pure function — no database calls, no side effects.
// This exact function is used in API routes AND in tests.
//
// If you find yourself wanting to add a DB call here, don't.
// Keep this as the single source of truth for what's legal.

import { PermitStatus, Role } from "@prisma/client";

// Minimal permit shape needed to make transition decisions
export interface PermitForTransition {
  id: string;
  status: PermitStatus;
  requesterId: string;
  areaId: string;
  plannedStart: Date;
  plannedEnd: Date;
  expiresAt: Date | null;
}

export interface ActorForTransition {
  id: string;
  role: Role;
  ownedAreaIds?: string[]; // only relevant for AREA_OWNER
}

export interface ApprovalState {
  areaOwnerApproved: boolean;
  safetyOfficerApproved: boolean;
}

export type PermitAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "ACTIVATE"
  | "SUSPEND"
  | "RESUME"
  | "CLOSE"
  | "VERIFY"
  | "CANCEL"
  | "EXPIRE";

export class PermitTransitionError extends Error {
  constructor(
    message: string,
    public code: string = "INVALID_TRANSITION"
  ) {
    super(message);
    this.name = "PermitTransitionError";
  }
}

// The terminal states — a permit in one of these can never move again
const TERMINAL_STATES: PermitStatus[] = [
  "EXPIRED",
  "CLOSED_VERIFIED",
  "REJECTED",
  "CANCELLED",
];

// Non-terminal states that can be cancelled
const CANCELLABLE_STATES: PermitStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
];

export function canActorApprove(
  permit: PermitForTransition,
  actor: ActorForTransition
): { allowed: boolean; reason?: string } {
  // A person can never approve their own permit — this is absolute
  if (actor.id === permit.requesterId) {
    return {
      allowed: false,
      reason: "You cannot approve a permit you raised yourself.",
    };
  }

  if (actor.role === "REQUESTER") {
    return { allowed: false, reason: "Requesters cannot approve permits." };
  }

  if (actor.role === "AREA_OWNER") {
    // Area owners can only approve for their own areas
    if (!actor.ownedAreaIds?.includes(permit.areaId)) {
      return {
        allowed: false,
        reason:
          "You can only approve permits for areas you are the owner of.",
      };
    }
  }

  return { allowed: true };
}

// Main transition function.
// Returns the new status on success, throws PermitTransitionError on failure.
export function transition(
  permit: PermitForTransition,
  action: PermitAction,
  actor: ActorForTransition,
  approvalState?: ApprovalState,
  now: Date = new Date()
): PermitStatus {
  const { status } = permit;

  // Nothing moves out of terminal states
  if (TERMINAL_STATES.includes(status)) {
    throw new PermitTransitionError(
      `Permit is in terminal state ${status} and cannot be changed.`,
      "TERMINAL_STATE"
    );
  }

  switch (action) {
    case "SUBMIT": {
      if (status !== "DRAFT") {
        throw new PermitTransitionError(
          `Cannot submit a permit that is in ${status} state. Only DRAFT permits can be submitted.`
        );
      }
      // Only the requester or admin submits
      if (actor.id !== permit.requesterId && actor.role !== "ADMIN") {
        throw new PermitTransitionError(
          "Only the permit requester can submit it.",
          "FORBIDDEN"
        );
      }
      return "PENDING_APPROVAL";
    }

    case "APPROVE": {
      if (status !== "PENDING_APPROVAL") {
        throw new PermitTransitionError(
          `Cannot approve a permit in ${status} state.`
        );
      }
      const check = canActorApprove(permit, actor);
      if (!check.allowed) {
        throw new PermitTransitionError(check.reason!, "FORBIDDEN");
      }
      // After this approval, if all required approvals are in, move to APPROVED
      // The caller passes the projected approvalState (including this new approval)
      if (!approvalState) {
        throw new PermitTransitionError("Approval state required.");
      }
      if (approvalState.areaOwnerApproved && approvalState.safetyOfficerApproved) {
        return "APPROVED";
      }
      // Still pending, stay in PENDING_APPROVAL
      return "PENDING_APPROVAL";
    }

    case "REJECT": {
      if (status !== "PENDING_APPROVAL") {
        throw new PermitTransitionError(
          `Cannot reject a permit in ${status} state.`
        );
      }
      const check = canActorApprove(permit, actor);
      if (!check.allowed) {
        throw new PermitTransitionError(check.reason!, "FORBIDDEN");
      }
      return "REJECTED";
    }

    case "ACTIVATE": {
      if (status !== "APPROVED") {
        throw new PermitTransitionError(
          `Cannot activate a permit in ${status} state. Must be APPROVED first.`
        );
      }
      // Only SAFETY_OFFICER or ADMIN can activate
      if (actor.role !== "SAFETY_OFFICER" && actor.role !== "ADMIN") {
        throw new PermitTransitionError(
          "Only a Safety Officer or Admin can activate a permit.",
          "FORBIDDEN"
        );
      }
      // Cannot activate before planned start
      if (now < permit.plannedStart) {
        throw new PermitTransitionError(
          `Permit cannot be activated before its planned start time (${permit.plannedStart.toISOString()}).`,
          "TOO_EARLY"
        );
      }
      // Cannot activate an expired permit
      if (now > permit.plannedEnd) {
        throw new PermitTransitionError(
          "Permit's planned end time has already passed. Raise a new permit.",
          "EXPIRED"
        );
      }
      return "ACTIVE";
    }

    case "SUSPEND": {
      if (status !== "ACTIVE") {
        throw new PermitTransitionError(
          `Cannot suspend a permit in ${status} state.`
        );
      }
      if (actor.role !== "SAFETY_OFFICER" && actor.role !== "ADMIN") {
        throw new PermitTransitionError(
          "Only a Safety Officer or Admin can suspend a permit.",
          "FORBIDDEN"
        );
      }
      return "SUSPENDED";
    }

    case "RESUME": {
      if (status !== "SUSPENDED") {
        throw new PermitTransitionError(
          `Cannot resume a permit in ${status} state.`
        );
      }
      if (actor.role !== "SAFETY_OFFICER" && actor.role !== "ADMIN") {
        throw new PermitTransitionError(
          "Only a Safety Officer or Admin can resume a permit.",
          "FORBIDDEN"
        );
      }
      // Check it hasn't expired while suspended
      if (permit.expiresAt && now > permit.expiresAt) {
        throw new PermitTransitionError(
          "Permit has expired while suspended. A new permit must be raised.",
          "EXPIRED"
        );
      }
      return "ACTIVE";
    }

    case "CLOSE": {
      if (status !== "ACTIVE") {
        throw new PermitTransitionError(
          `Cannot close a permit in ${status} state. Only ACTIVE permits can be closed.`
        );
      }
      // Requester closes their own, or safety officer / admin closes any
      const canClose =
        actor.id === permit.requesterId ||
        actor.role === "SAFETY_OFFICER" ||
        actor.role === "ADMIN";
      if (!canClose) {
        throw new PermitTransitionError(
          "Only the permit requester, Safety Officer, or Admin can close a permit.",
          "FORBIDDEN"
        );
      }
      return "CLOSED";
    }

    case "VERIFY": {
      if (status !== "CLOSED") {
        throw new PermitTransitionError(
          `Cannot verify a permit in ${status} state. Must be CLOSED first.`
        );
      }
      if (actor.role !== "SAFETY_OFFICER" && actor.role !== "ADMIN") {
        throw new PermitTransitionError(
          "Only a Safety Officer or Admin can verify permit closure.",
          "FORBIDDEN"
        );
      }
      return "CLOSED_VERIFIED";
    }

    case "CANCEL": {
      if (!CANCELLABLE_STATES.includes(status)) {
        throw new PermitTransitionError(
          `Cannot cancel a permit in ${status} state.`
        );
      }
      // Requester can cancel their own DRAFT or PENDING permits
      // Safety officer and admin can cancel anything non-terminal
      const canCancel =
        actor.role === "SAFETY_OFFICER" ||
        actor.role === "ADMIN" ||
        (actor.id === permit.requesterId &&
          (status === "DRAFT" || status === "PENDING_APPROVAL"));
      if (!canCancel) {
        throw new PermitTransitionError(
          "You don't have permission to cancel this permit in its current state.",
          "FORBIDDEN"
        );
      }
      return "CANCELLED";
    }

    case "EXPIRE": {
      // Only called by the cron job
      if (status !== "ACTIVE" && status !== "APPROVED" && status !== "SUSPENDED") {
        throw new PermitTransitionError(
          `Cannot expire a permit in ${status} state.`
        );
      }
      return "EXPIRED";
    }

    default: {
      throw new PermitTransitionError(`Unknown action: ${action}`);
    }
  }
}
