import { describe, it, expect } from "vitest";
import { canApprovePermit, getAvailableActions, canManageSystem } from "@/lib/permissions";

describe("Permission checks — canApprovePermit", () => {
  it("allows safety officer to approve any permit (not their own)", () => {
    const result = canApprovePermit(
      { id: "so-1", role: "SAFETY_OFFICER" },
      { permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks requester from approving anything", () => {
    const result = canApprovePermit(
      { id: "req-1", role: "REQUESTER" },
      { permitRequesterId: "req-99", permitAreaId: "area-1" }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cannot approve");
  });

  it("blocks area owner approving permit in wrong area", () => {
    const result = canApprovePermit(
      { id: "ao-1", role: "AREA_OWNER", ownedAreaIds: ["area-2"] },
      { permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("assigned areas");
  });

  it("allows area owner to approve in their area", () => {
    const result = canApprovePermit(
      { id: "ao-1", role: "AREA_OWNER", ownedAreaIds: ["area-1"] },
      { permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks anyone from approving their own permit", () => {
    const result = canApprovePermit(
      { id: "so-1", role: "SAFETY_OFFICER" },
      { permitRequesterId: "so-1", permitAreaId: "area-1" }
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("own permit");
  });
});

describe("Permission checks — canManageSystem", () => {
  it("allows admin to manage system", () => {
    expect(canManageSystem({ id: "a", role: "ADMIN" })).toBe(true);
  });

  it("blocks non-admin from managing system", () => {
    expect(canManageSystem({ id: "a", role: "SAFETY_OFFICER" })).toBe(false);
    expect(canManageSystem({ id: "a", role: "REQUESTER" })).toBe(false);
    expect(canManageSystem({ id: "a", role: "AREA_OWNER" })).toBe(false);
  });
});

describe("Permission checks — getAvailableActions", () => {
  it("requester on DRAFT permit sees EDIT, SUBMIT, CANCEL", () => {
    const actions = getAvailableActions(
      { id: "req-1", role: "REQUESTER" },
      { permitStatus: "DRAFT", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actions).toContain("EDIT");
    expect(actions).toContain("SUBMIT");
    expect(actions).toContain("CANCEL");
  });

  it("safety officer on PENDING_APPROVAL sees APPROVE, REJECT, CANCEL", () => {
    const actions = getAvailableActions(
      { id: "so-1", role: "SAFETY_OFFICER" },
      { permitStatus: "PENDING_APPROVAL", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actions).toContain("APPROVE");
    expect(actions).toContain("REJECT");
  });

  it("requester on ACTIVE permit sees CLOSE and REQUEST_EXTENSION only", () => {
    const actions = getAvailableActions(
      { id: "req-1", role: "REQUESTER" },
      { permitStatus: "ACTIVE", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actions).toContain("CLOSE");
    expect(actions).toContain("REQUEST_EXTENSION");
    expect(actions).not.toContain("SUSPEND");
    expect(actions).not.toContain("ACTIVATE");
  });

  it("safety officer on ACTIVE permit sees SUSPEND, CLOSE, CANCEL", () => {
    const actions = getAvailableActions(
      { id: "so-1", role: "SAFETY_OFFICER" },
      { permitStatus: "ACTIVE", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actions).toContain("SUSPEND");
    expect(actions).toContain("CLOSE");
    expect(actions).toContain("CANCEL");
  });

  it("nobody sees actions on EXPIRED permit", () => {
    const actionsAdmin = getAvailableActions(
      { id: "admin-1", role: "ADMIN" },
      { permitStatus: "EXPIRED", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actionsAdmin.length).toBe(0);
  });

  it("nobody sees actions on CLOSED_VERIFIED permit", () => {
    const actions = getAvailableActions(
      { id: "so-1", role: "SAFETY_OFFICER" },
      { permitStatus: "CLOSED_VERIFIED", permitRequesterId: "req-1", permitAreaId: "area-1" }
    );
    expect(actions.length).toBe(0);
  });
});
