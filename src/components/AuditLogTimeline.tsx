"use client";

import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

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
    CREATED:             { label: "Created",              color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    SUBMITTED:           { label: "Submitted",            color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
    // APPROVED but status didn't change means partial approval (one of two approvers)
    APPROVED:            sameStatus
      ? { label: "Approval Recorded",    color: "#60a5fa", bg: "rgba(59,130,246,0.15)" }
      : { label: "Fully Approved",       color: "#34d399", bg: "rgba(52,211,153,0.15)" },
    REJECTED:            { label: "Rejected",             color: "#f87171", bg: "rgba(239,68,68,0.15)" },
    ACTIVATED:           { label: "Activated",            color: "#a3e635", bg: "rgba(163,230,53,0.15)" },
    SUSPENDED:           { label: "Work Suspended",       color: "#fb923c", bg: "rgba(249,115,22,0.15)" },
    RESUMED:             { label: "Work Resumed",         color: "#34d399", bg: "rgba(52,211,153,0.15)" },
    CLOSED:              { label: "Closed by Requester",  color: "#c084fc", bg: "rgba(192,132,252,0.15)" },
    VERIFIED:            { label: "Closure Verified",     color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
    CANCELLED:           { label: "Cancelled",            color: "#64748b", bg: "rgba(100,116,139,0.12)" },
    AUTO_EXPIRED:        { label: "Auto-Expired",         color: "#64748b", bg: "rgba(100,116,139,0.12)" },
    FIELD_UPDATED:       { label: "Field Updated",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    EXTENSION_REQUESTED: { label: "Extension Requested",  color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
    EXTENSION_APPROVED:  { label: "Extension Approved",   color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    EXTENSION_REJECTED:  { label: "Extension Rejected",   color: "#f87171", bg: "rgba(239,68,68,0.12)" },
  };
  return map[action] ?? { label: action, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
}

const ROLE_LABELS: Record<string, string> = {
  REQUESTER: "Requester",
  AREA_OWNER: "Area Owner",
  SAFETY_OFFICER: "Safety Officer",
  ADMIN: "Admin",
};

const STATUS_SHORT: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
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
      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-5 flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-amber-400" />
        Audit Trail & History
      </h2>
      {logs.length === 0 ? (
        <p className="text-xs text-slate-500">No events recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {[...logs].reverse().map((log) => {
            const sameStatus = log.fromStatus !== null && log.fromStatus === log.toStatus;
            const meta = getActionMeta(log.action, sameStatus);
            return (
              <div key={log.id} className="timeline-entry">
                {/* Dot */}
                <div
                  className="timeline-dot flex-shrink-0"
                  style={{
                    background: meta.bg,
                    border: `1px solid ${meta.color}40`,
                    boxShadow: `0 0 10px ${meta.color}20`,
                  }}
                >
                  <span style={{ color: meta.color, fontSize: "0.55rem", fontWeight: 700 }}>
                    {meta.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[0.7rem] text-slate-500 flex-shrink-0 font-mono">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-1">
                    <span className="text-slate-200 font-medium">{log.actor.name}</span>
                    <span className="text-amber-400/70 font-mono text-[0.68rem] ml-1">
                      [{ROLE_LABELS[log.actor.role] ?? log.actor.role}]
                    </span>
                  </p>

                  {/* Status change badge display */}
                  {log.fromStatus && log.toStatus && !sameStatus && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={`status-badge status-${log.fromStatus} py-0 px-2`}
                        style={{ fontSize: "0.62rem" }}
                      >
                        {STATUS_SHORT[log.fromStatus] ?? log.fromStatus}
                      </span>
                      <span className="text-amber-400/80 text-xs font-bold">→</span>
                      <span
                        className={`status-badge status-${log.toStatus} py-0 px-2`}
                        style={{ fontSize: "0.62rem" }}
                      >
                        {STATUS_SHORT[log.toStatus] ?? log.toStatus}
                      </span>
                    </div>
                  )}

                  {/* Partial approval note */}
                  {sameStatus && log.action === "APPROVED" && (
                    <p className="text-xs mt-1 text-slate-400">
                      Approval registered · Awaiting remaining required approval(s)
                    </p>
                  )}

                  {/* Field edit */}
                  {log.fieldName && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      <span className="text-amber-400/80">{log.fieldName}</span>
                      {log.oldValue && (
                        <span className="line-through text-red-400/80 mx-1">{log.oldValue}</span>
                      )}
                      {log.newValue && (
                        <span className="text-emerald-400/90">{log.newValue}</span>
                      )}
                    </p>
                  )}

                  {/* Comment */}
                  {log.comment && (
                    <p
                      className="text-xs mt-1.5 italic px-2.5 py-1.5 rounded-lg text-slate-300"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      "{log.comment}"
                    </p>
                  )}

                  <p className="text-[0.65rem] text-slate-500 mt-1 font-mono">
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
