"use client";

import { formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  timestamp: string;
  actor: { id: string; name: string; role: string };
}

function getActionMeta(action: string, sameStatus?: boolean): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    CREATED:             { label: "Created",              color: "#64748b", bg: "rgba(100,116,139,0.15)" },
    SUBMITTED:           { label: "Submitted",            color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
    // APPROVED but status didn't change means partial approval (one of two approvers)
    APPROVED:            sameStatus
      ? { label: "Approval Recorded",    color: "#60a5fa", bg: "rgba(59,130,246,0.12)" }
      : { label: "Fully Approved",       color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
    REJECTED:            { label: "Rejected",             color: "#f87171", bg: "rgba(239,68,68,0.15)" },
    ACTIVATED:           { label: "Activated",            color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    SUSPENDED:           { label: "Work Suspended",       color: "#fb923c", bg: "rgba(249,115,22,0.15)" },
    RESUMED:             { label: "Work Resumed",         color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
    CLOSED:              { label: "Closed by Requester",  color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
    VERIFIED:            { label: "Closure Verified",     color: "#22d3ee", bg: "rgba(6,182,212,0.15)" },
    CANCELLED:           { label: "Cancelled",            color: "#9ca3af", bg: "rgba(107,114,128,0.1)" },
    AUTO_EXPIRED:        { label: "Auto-Expired",         color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
    FIELD_UPDATED:       { label: "Field Updated",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    EXTENSION_REQUESTED: { label: "Extension Requested",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    EXTENSION_APPROVED:  { label: "Extension Approved",   color: "#4ade80", bg: "rgba(34,197,94,0.1)" },
    EXTENSION_REJECTED:  { label: "Extension Rejected",   color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  };
  return map[action] ?? { label: action, color: "#64748b", bg: "rgba(100,116,139,0.1)" };
}

const ROLE_LABELS: Record<string, string> = {
  REQUESTER: "Requester",
  AREA_OWNER: "Area Owner",
  SAFETY_OFFICER: "Safety Officer",
  ADMIN: "Admin",
};

const STATUS_SHORT: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  CLOSED: "Closed",
  CLOSED_VERIFIED: "Closed & Verified",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function AuditLogTimeline({ logs }: { logs: AuditEntry[] }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Audit Trail</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-600">No events yet.</p>
      ) : (
        <div>
          {[...logs].reverse().map((log) => {
            const sameStatus = log.fromStatus !== null && log.fromStatus === log.toStatus;
            const meta = getActionMeta(log.action, sameStatus);
            return (
              <div key={log.id} className="timeline-entry">
                {/* Dot */}
                <div
                  className="timeline-dot flex-shrink-0"
                  style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
                >
                  <span style={{ color: meta.color, fontSize: "0.55rem", fontWeight: 700 }}>
                    {meta.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-0.5">
                    {log.actor.name}
                    <span className="text-slate-700"> · {ROLE_LABELS[log.actor.role]}</span>
                  </p>

                  {/* Status change — only show if status actually changed */}
                  {log.fromStatus && log.toStatus && !sameStatus && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`status-badge status-${log.fromStatus} py-0 px-1.5`} style={{ fontSize: "0.6rem" }}>
                        {STATUS_SHORT[log.fromStatus] ?? log.fromStatus}
                      </span>
                      <span className="text-slate-700 text-xs">→</span>
                      <span className={`status-badge status-${log.toStatus} py-0 px-1.5`} style={{ fontSize: "0.6rem" }}>
                        {STATUS_SHORT[log.toStatus] ?? log.toStatus}
                      </span>
                    </div>
                  )}

                  {/* Partial approval note */}
                  {sameStatus && log.action === "APPROVED" && (
                    <p className="text-xs mt-1" style={{ color: "#475569" }}>
                      Awaiting remaining approver(s)
                    </p>
                  )}

                  {/* Field edit */}
                  {log.fieldName && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      <span className="font-mono text-slate-500">{log.fieldName}</span>
                      {log.oldValue && <span className="line-through text-red-900 mx-1">{log.oldValue}</span>}
                      {log.newValue && <span className="text-green-800">{log.newValue}</span>}
                    </p>
                  )}

                  {/* Comment */}
                  {log.comment && (
                    <p
                      className="text-xs mt-1.5 italic px-2 py-1.5 rounded-lg"
                      style={{ color: "#64748b", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      "{log.comment}"
                    </p>
                  )}

                  <p className="text-xs text-slate-700 mt-1">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
