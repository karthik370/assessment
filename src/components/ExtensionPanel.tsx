"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

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
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-3 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        Extension Requests
      </h3>

      {error && (
        <p
          className="text-xs text-red-300 mb-3 px-3 py-2 rounded-xl"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
        >
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
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: isPending
                  ? "1px solid rgba(251,191,36,0.3)"
                  : ext.status === "APPROVED"
                  ? "1px solid rgba(52,211,153,0.2)"
                  : "1px solid rgba(248,113,113,0.2)",
              }}
            >
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : ext.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">+{ext.requestedHours}h extension</span>
                  <span
                    className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      color: isPending ? "#fbbf24" : ext.status === "APPROVED" ? "#6ee7b7" : "#fca5a5",
                      background: isPending
                        ? "rgba(251,191,36,0.12)"
                        : ext.status === "APPROVED"
                        ? "rgba(52,211,153,0.12)"
                        : "rgba(248,113,113,0.12)",
                      border: isPending
                        ? "1px solid rgba(251,191,36,0.35)"
                        : ext.status === "APPROVED"
                        ? "1px solid rgba(52,211,153,0.25)"
                        : "1px solid rgba(248,113,113,0.25)",
                    }}
                  >
                    {isPending ? "Pending Review" : ext.status}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div
                  className="px-3 pb-3 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <p className="text-xs text-slate-400 mt-2 mb-1">
                    <span className="text-slate-500">Requested by</span>{" "}
                    <span className="text-slate-200 font-medium">{ext.requester.name}</span>
                    {ext.createdAt && (
                      <span className="text-slate-500 font-mono text-[0.68rem] ml-1">
                        · {new Date(ext.createdAt).toLocaleString("en-IN")}
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs text-slate-300 mt-1 mb-3 italic px-2.5 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    "{ext.reason}"
                  </p>

                  {ext.approver && (
                    <p className="text-xs text-slate-400 mb-2">
                      Decided by: <span className="text-slate-200 font-medium">{ext.approver.name}</span>
                      {ext.approvedAt && (
                        <span className="text-slate-500 font-mono text-[0.68rem] ml-1">
                          · {new Date(ext.approvedAt).toLocaleString("en-IN")}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Decision buttons — only for safety officers on pending requests */}
                  {isPending && canDecide && (
                    <div className="flex gap-2 mt-2">
                      <button
                        id={`ext-approve-${ext.id}`}
                        onClick={() => decide(ext.id, true)}
                        disabled={loading === ext.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          border: "1px solid rgba(52,211,153,0.3)",
                          color: "#6ee7b7",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(52,211,153,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(52,211,153,0.1)";
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {loading === ext.id ? "Processing…" : "Approve Extension"}
                      </button>
                      <button
                        id={`ext-reject-${ext.id}`}
                        onClick={() => decide(ext.id, false)}
                        disabled={loading === ext.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        style={{
                          background: "rgba(248,113,113,0.1)",
                          border: "1px solid rgba(248,113,113,0.3)",
                          color: "#fca5a5",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(248,113,113,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {loading === ext.id ? "Processing…" : "Reject Extension"}
                      </button>
                    </div>
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
