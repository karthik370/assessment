"use client";

import { CheckCircle, XCircle, Clock, User } from "lucide-react";

interface Approval {
  id: string;
  role: string;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string; role: string };
}

const ROLE_LABELS: Record<string, string> = {
  AREA_OWNER: "Area Owner",
  SAFETY_OFFICER: "Safety Officer",
  ADMIN: "Administrator",
};

export default function ApprovalTrail({ approvals }: { approvals: Approval[] }) {
  if (approvals.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Approval Trail</h3>
        <p className="text-xs text-slate-600">No approvals yet.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Approval Trail</h3>
      <div className="space-y-3">
        {approvals.map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-lg text-xs"
            style={{
              background:
                a.status === "APPROVED"
                  ? "rgba(16,185,129,0.06)"
                  : a.status === "REJECTED"
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(59,130,246,0.06)",
              border:
                a.status === "APPROVED"
                  ? "1px solid rgba(16,185,129,0.15)"
                  : a.status === "REJECTED"
                  ? "1px solid rgba(239,68,68,0.15)"
                  : "1px solid rgba(59,130,246,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">{a.approver.name}</span>
              <span className="flex items-center gap-1">
                {a.status === "APPROVED" ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : a.status === "REJECTED" ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span
                  className={
                    a.status === "APPROVED"
                      ? "text-green-400"
                      : a.status === "REJECTED"
                      ? "text-red-400"
                      : "text-blue-400"
                  }
                >
                  {a.status}
                </span>
              </span>
            </div>
            <p className="text-slate-500">{ROLE_LABELS[a.role]}</p>
            {a.comment && (
              <p className="text-slate-400 mt-1 italic">"{a.comment}"</p>
            )}
            {a.decidedAt && (
              <p className="text-slate-600 mt-1">
                {new Date(a.decidedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
