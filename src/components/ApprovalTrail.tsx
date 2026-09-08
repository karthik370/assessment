"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";

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
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Approval Trail
        </h3>
        <p className="text-xs text-slate-500">No approvals recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-3 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        Approval Trail
      </h3>
      <div className="space-y-2.5">
        {approvals.map((a) => {
          const isApproved = a.status === "APPROVED";
          const isRejected = a.status === "REJECTED";
          const isPending = !isApproved && !isRejected;

          return (
            <div
              key={a.id}
              className="p-3 rounded-xl text-xs transition-all"
              style={{
                background: isApproved
                  ? "rgba(16,185,129,0.06)"
                  : isRejected
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(251,191,36,0.08)",
                border: isApproved
                  ? "1px solid rgba(16,185,129,0.2)"
                  : isRejected
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(251,191,36,0.25)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-200">{a.approver.name}</span>
                <span className="flex items-center gap-1.5 font-bold">
                  {isApproved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isRejected ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span
                    className={
                      isApproved
                        ? "text-emerald-400"
                        : isRejected
                        ? "text-red-400"
                        : "text-amber-400"
                    }
                  >
                    {a.status}
                  </span>
                </span>
              </div>
              <p className="text-[0.7rem] text-slate-400 font-medium">
                {ROLE_LABELS[a.role] ?? a.role}
              </p>
              {a.comment && (
                <p className="text-slate-300 mt-1.5 italic bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                  "{a.comment}"
                </p>
              )}
              {a.decidedAt && (
                <p className="text-[0.65rem] text-slate-500 mt-1 font-mono">
                  Decided: {new Date(a.decidedAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
