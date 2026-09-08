import { describe, it, expect } from "vitest";
import {
  transition,
  PermitTransitionError,
  PermitForTransition,
  ActorForTransition,
} from "@/lib/permit-state-machine";

// Baseline permit in DRAFT state
function makeDraftPermit(overrides?: Partial<PermitForTransition>): PermitForTransition {
  const now = new Date();
  const start = new Date(now.getTime() - 60_000); // 1 min ago
  const end = new Date(now.getTime() + 8 * 3600_000); // 8h from now
  return {
    id: "permit-1",
    status: "DRAFT",
    requesterId: "user-requester",
    areaId: "area-1",
    plannedStart: start,
    plannedEnd: end,
    expiresAt: end,
    ...overrides,
  };
}

const requester: ActorForTransition = {
  id: "user-requester",
  role: "REQUESTER",
};

const areaOwner: ActorForTransition = {
  id: "user-area-owner",
  role: "AREA_OWNER",
  ownedAreaIds: ["area-1"],
};

const areaOwnerWrongArea: ActorForTransition = {
  id: "user-area-owner",
  role: "AREA_OWNER",
  ownedAreaIds: ["area-99"], // different area
};

const safetyOfficer: ActorForTransition = {
  id: "user-safety",
  role: "SAFETY_OFFICER",
};

const admin: ActorForTransition = {
  id: "user-admin",
  role: "ADMIN",
};

// Requester who is also safety officer (shouldn't approve own permit)
const safetyOfficerAsRequester: ActorForTransition = {
  id: "user-requester", // same id as requester
  role: "SAFETY_OFFICER",
};

describe("Permit State Machine — valid transitions", () => {
  it("DRAFT → PENDING_APPROVAL on SUBMIT by requester", () => {
    const permit = makeDraftPermit();
    const result = transition(permit, "SUBMIT", requester);
    expect(result).toBe("PENDING_APPROVAL");
  });

  it("PENDING_APPROVAL → PENDING_APPROVAL on partial approval (only area owner)", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    const result = transition(permit, "APPROVE", areaOwner, {
      areaOwnerApproved: true,
      safetyOfficerApproved: false,
    });
    expect(result).toBe("PENDING_APPROVAL");
  });

  it("PENDING_APPROVAL → APPROVED when both approvers approve", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    const result = transition(permit, "APPROVE", safetyOfficer, {
      areaOwnerApproved: true,
      safetyOfficerApproved: true,
    });
    expect(result).toBe("APPROVED");
  });

  it("APPROVED → ACTIVE on ACTIVATE by safety officer after plannedStart", () => {
    const permit = makeDraftPermit({ status: "APPROVED" });
    const result = transition(permit, "ACTIVATE", safetyOfficer);
    expect(result).toBe("ACTIVE");
  });

  it("ACTIVE → SUSPENDED on SUSPEND by safety officer", () => {
    const permit = makeDraftPermit({ status: "ACTIVE" });
    const result = transition(permit, "SUSPEND", safetyOfficer);
    expect(result).toBe("SUSPENDED");
  });

  it("SUSPENDED → ACTIVE on RESUME by safety officer", () => {
    const permit = makeDraftPermit({ status: "SUSPENDED" });
    const result = transition(permit, "RESUME", safetyOfficer);
    expect(result).toBe("ACTIVE");
  });

  it("ACTIVE → CLOSED on CLOSE by requester", () => {
    const permit = makeDraftPermit({ status: "ACTIVE" });
    const result = transition(permit, "CLOSE", requester);
    expect(result).toBe("CLOSED");
  });

  it("CLOSED → CLOSED_VERIFIED on VERIFY by safety officer", () => {
    const permit = makeDraftPermit({ status: "CLOSED" });
    const result = transition(permit, "VERIFY", safetyOfficer);
    expect(result).toBe("CLOSED_VERIFIED");
  });

  it("PENDING_APPROVAL → REJECTED on REJECT by safety officer", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    const result = transition(permit, "REJECT", safetyOfficer);
    expect(result).toBe("REJECTED");
  });

  it("ACTIVE → EXPIRED on EXPIRE (cron)", () => {
    const permit = makeDraftPermit({ status: "ACTIVE" });
    const result = transition(permit, "EXPIRE", admin);
    expect(result).toBe("EXPIRED");
  });

  it("DRAFT → CANCELLED by requester", () => {
    const permit = makeDraftPermit({ status: "DRAFT" });
    const result = transition(permit, "CANCEL", requester);
    expect(result).toBe("CANCELLED");
  });

  it("ACTIVE → CANCELLED by safety officer", () => {
    const permit = makeDraftPermit({ status: "ACTIVE" });
    const result = transition(permit, "CANCEL", safetyOfficer);
    expect(result).toBe("CANCELLED");
  });
});

describe("Permit State Machine — illegal transitions", () => {
  it("throws when trying to submit a non-DRAFT permit", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    expect(() => transition(permit, "SUBMIT", requester)).toThrow(
      PermitTransitionError
    );
  });

  it("throws when requester tries to approve", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    expect(() =>
      transition(permit, "APPROVE", requester, {
        areaOwnerApproved: true,
        safetyOfficerApproved: true,
      })
    ).toThrow(PermitTransitionError);
  });

  it("throws when area owner approves permit outside their area", () => {
    const permit = makeDraftPermit({ status: "PENDING_APPROVAL" });
    expect(() =>
      transition(permit, "APPROVE", areaOwnerWrongArea, {
        areaOwnerApproved: true,
        safetyOfficerApproved: true,
      })
    ).toThrow(PermitTransitionError);
  });

  it("throws when activating before plannedStart", () => {
    const future = new Date(Date.now() + 2 * 3600_000); // 2h from now
    const permit = makeDraftPermit({
      status: "APPROVED",
      plannedStart: future,
    });
    expect(() => transition(permit, "ACTIVATE", safetyOfficer)).toThrow(
      PermitTransitionError
    );
  });

  it("throws when activating an expired approved permit", () => {
    const past = new Date(Date.now() - 3600_000); // 1h ago
    const permit = makeDraftPermit({
      status: "APPROVED",
      plannedEnd: past,
    });
    expect(() => transition(permit, "ACTIVATE", safetyOfficer)).toThrow(
      PermitTransitionError
    );
  });

  it("throws when non-safety-officer tries to suspend", () => {
    const permit = makeDraftPermit({ status: "ACTIVE" });
    expect(() => transition(permit, "SUSPEND", requester)).toThrow(
      PermitTransitionError
    );
  });

  it("throws when resuming an expired-while-suspended permit", () => {
    const permit = makeDraftPermit({
      status: "SUSPENDED",
      expiresAt: new Date(Date.now() - 1000), // already expired
    });
    expect(() => transition(permit, "RESUME", safetyOfficer)).toThrow(
      PermitTransitionError
    );
  });

  it("throws on any action against a terminal state (EXPIRED)", () => {
    const permit = makeDraftPermit({ status: "EXPIRED" });
    expect(() => transition(permit, "ACTIVATE", admin)).toThrow(
      PermitTransitionError
    );
  });

  it("throws on any action against a terminal state (CANCELLED)", () => {
    const permit = makeDraftPermit({ status: "CANCELLED" });
    expect(() => transition(permit, "SUBMIT", requester)).toThrow(
      PermitTransitionError
    );
  });

  it("throws on any action against a terminal state (CLOSED_VERIFIED)", () => {
    const permit = makeDraftPermit({ status: "CLOSED_VERIFIED" });
    expect(() => transition(permit, "CANCEL", admin)).toThrow(
      PermitTransitionError
    );
  });
});

describe("Self-approval rule — the most critical safety invariant", () => {
  it("throws when safety officer tries to approve their own permit", () => {
    // The requester happens to also be a safety officer
    const permit = makeDraftPermit({
      status: "PENDING_APPROVAL",
      requesterId: "user-requester",
    });
    expect(() =>
      transition(permit, "APPROVE", safetyOfficerAsRequester, {
        areaOwnerApproved: true,
        safetyOfficerApproved: true,
      })
    ).toThrow(PermitTransitionError);
  });

  it("throws when admin tries to approve their own permit", () => {
    const permit = makeDraftPermit({
      status: "PENDING_APPROVAL",
      requesterId: "user-admin",
    });
    const adminAsRequester: ActorForTransition = {
      id: "user-admin",
      role: "ADMIN",
    };
    expect(() =>
      transition(permit, "APPROVE", adminAsRequester, {
        areaOwnerApproved: true,
        safetyOfficerApproved: true,
      })
    ).toThrow(PermitTransitionError);
  });

  it("throws when area owner approves permit they raised in their own area", () => {
    const permit = makeDraftPermit({
      status: "PENDING_APPROVAL",
      requesterId: "user-area-owner", // same person
      areaId: "area-1",
    });
    const areaOwnerAsRequester: ActorForTransition = {
      id: "user-area-owner",
      role: "AREA_OWNER",
      ownedAreaIds: ["area-1"],
    };
    expect(() =>
      transition(permit, "APPROVE", areaOwnerAsRequester, {
        areaOwnerApproved: true,
        safetyOfficerApproved: false,
      })
    ).toThrow(PermitTransitionError);
  });
});
