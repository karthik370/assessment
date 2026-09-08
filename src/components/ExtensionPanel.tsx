"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Extension {
  id: string;
  requestedHours: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  approvedAt: string | null;
  requester: { id: string; name: string };
  approver: { id: string; name: string } | null;
}

interface ExtensionPanelProps {
  permitId: string;
  extensions: Extension[];
  userRole: string;
}

export default function ExtensionPanel({ permitId, extensions, userRole }: ExtensionPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(
    extensions.find((e) => e.status === "PENDING")?.id ?? null
  );

  const canDecide = userRole === "SAFETY_OFFICER" || userRole === "ADMIN";

  async function decide(extensionId: string, approved: boolean) {
    setLoading(extensionId);
    setError("");
    const res = await fetch(`/api/permits/${permitId}/extend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extensionId, approved }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to process extension.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        Extension Requests
      </h3>

      {error && (
        <p className="text-xs text-red-400 mb-3 px-2 py-1.5 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          {error}
        </p>
      )}

      <div className="space-y-2">
        {extensions.map((ext) => {
          const isPending = ext.status === "PENDING";
          const isExpanded = expanded === ext.id;

          return (
            <div
              key={ext.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: isPending
                  ? "1px solid rgba(96,165,250,0.2)"
                  : ext.status === "APPROVED"
                  ? "1px solid rgba(74,222,128,0.15)"
                  : "1px solid rgba(248,113,113,0.15)",
              }}
            >
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => setExpanded(isExpanded ? null : ext.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">+{ext.requestedHours}h extension</span>
                  <span
                    className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                    style={{
                      color: isPending ? "#93c5fd" : ext.status === "APPROVED" ? "#86efac" : "#fca5a5",
                      background: isPending ? "rgba(96,165,250,0.1)" : ext.status === "APPROVED" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                      border: isPending ? "1px solid rgba(96,165,250,0.2)" : ext.status === "APPROVED" ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    {isPending ? "Awaiting Decision" : ext.status}
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs text-slate-500 mt-2 mb-1">
                    <span className="text-slate-600">Requested by</span> {ext.requester.name}
                    {ext.createdAt && (
                      <span className="text-slate-700"> · {new Date(ext.createdAt).toLocaleString("en-IN")}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-3 italic px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    "{ext.reason}"
                  </p>

                  {ext.approver && (
                    <p className="text-xs text-slate-600 mb-2">
                      Decided by: {ext.approver.name}
                      {ext.approvedAt && <span> · {new Date(ext.approvedAt).toLocaleString("en-IN")}</span>}
                    </p>
                  )}

                  {/* Decision buttons — only for safety officers on pending requests */}
                  {isPending && canDecide && (
                    <div className="flex gap-2 mt-2">
                      <button
                        id={`ext-approve-${ext.id}`}
                        onClick={() => decide(ext.id, true)}
                        disabled={loading === ext.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: "rgba(74,222,128,0.08)",
                          border: "1px solid rgba(74,222,128,0.2)",
                          color: "#86efac",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.15)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.08)"; }}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {loading === ext.id ? "Processing…" : "Approve Extension"}
                      </button>
                      <button
                        id={`ext-reject-${ext.id}`}
                        onClick={() => decide(ext.id, false)}
                        disabled={loading === ext.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.2)",
                          color: "#fca5a5",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {isPending && !canDecide && (
                    <p className="text-xs text-slate-600 text-center py-1">
                      Awaiting Safety Officer decision
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
