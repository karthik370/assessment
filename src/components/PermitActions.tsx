"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send, CheckCircle, XCircle, Play, Pause, RotateCcw,
  XOctagon, Lock, Shield, Clock, AlertCircle
} from "lucide-react";

interface PermitActionsProps {
  permitId: string;
  permitNumber: string;
  availableActions: string[];
  status: string;
  expiresAt: string | Date | null;
  requesterId: string;
  currentUserId: string;
}

type ActionConfig = {
  label: string;
  icon: React.ReactNode;
  className: string;
  needsComment?: boolean;
  commentLabel?: string;
  commentRequired?: boolean;
  confirmText?: string;
  dangerous?: boolean;
};

const ACTION_CONFIG: Record<string, ActionConfig> = {
  SUBMIT: {
    label: "Submit for Approval",
    icon: <Send className="w-4 h-4" />,
    className: "btn-primary",
    confirmText: "Submit this permit for approval? Approvers will be notified.",
  },
  APPROVE: {
    label: "Approve",
    icon: <CheckCircle className="w-4 h-4" />,
    className: "btn-primary",
    needsComment: true,
    commentLabel: "Approval comment (optional)",
  },
  REJECT: {
    label: "Reject",
    icon: <XCircle className="w-4 h-4" />,
    className: "btn-danger",
    needsComment: true,
    commentLabel: "Rejection reason (required)",
    commentRequired: true,
    dangerous: true,
  },
  ACTIVATE: {
    label: "Activate — Start Work",
    icon: <Play className="w-4 h-4" />,
    className: "btn-primary",
    confirmText: "Activate this permit? This authorises work to begin.",
  },
  SUSPEND: {
    label: "Suspend — Stop Work",
    icon: <Pause className="w-4 h-4" />,
    className: "btn-amber",
    needsComment: true,
    commentLabel: "Suspension reason",
    commentRequired: true,
    dangerous: true,
    confirmText: undefined,
  },
  RESUME: {
    label: "Resume Work",
    icon: <RotateCcw className="w-4 h-4" />,
    className: "btn-primary",
    needsComment: true,
    commentLabel: "Resume notes (optional)",
  },
  CLOSE: {
    label: "Mark Work Complete",
    icon: <Lock className="w-4 h-4" />,
    className: "btn-primary",
    needsComment: true,
    commentLabel: "Closure notes — describe what was done and area condition",
    commentRequired: true,
  },
  VERIFY: {
    label: "Verify & Close",
    icon: <Shield className="w-4 h-4" />,
    className: "btn-primary",
    needsComment: true,
    commentLabel: "Site verification notes (area clean, equipment safe)",
    commentRequired: true,
  },
  CANCEL: {
    label: "Cancel Permit",
    icon: <XOctagon className="w-4 h-4" />,
    className: "btn-danger",
    needsComment: true,
    commentLabel: "Reason for cancellation",
    dangerous: true,
  },
  REQUEST_EXTENSION: {
    label: "Request Extension",
    icon: <Clock className="w-4 h-4" />,
    className: "btn-ghost",
    needsComment: true,
    commentLabel: "Reason for extension",
    commentRequired: true,
  },
};

const ACTION_ENDPOINTS: Record<string, string> = {
  SUBMIT: "submit",
  APPROVE: "approve",
  REJECT: "reject",
  ACTIVATE: "activate",
  SUSPEND: "suspend",
  RESUME: "resume",
  CLOSE: "close",
  VERIFY: "verify",
  CANCEL: "cancel",
  REQUEST_EXTENSION: "extend",
};

export default function PermitActions({
  permitId,
  permitNumber,
  availableActions,
  status,
  expiresAt,
  requesterId,
  currentUserId,
}: PermitActionsProps) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [extHours, setExtHours] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (availableActions.length === 0) {
    return (
      <div className="card p-4 text-center text-xs text-slate-600">
        No actions available for your role in this permit's current state.
      </div>
    );
  }

  async function executeAction(action: string) {
    setLoading(true);
    setError("");

    const endpoint = ACTION_ENDPOINTS[action];
    const config = ACTION_CONFIG[action];

    const body: any = {};
    if (action === "APPROVE" || action === "RESUME") body.comment = comment;
    if (action === "REJECT") body.reason = comment;
    if (action === "SUSPEND") body.reason = comment;
    if (action === "CLOSE") body.closureNotes = comment;
    if (action === "VERIFY") body.verifiedNotes = comment;
    if (action === "CANCEL") body.reason = comment;
    if (action === "REQUEST_EXTENSION") {
      body.requestedHours = extHours;
      body.reason = comment;
    }

    const res = await fetch(`/api/permits/${permitId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setActiveModal(null);
    setComment("");
    router.refresh();
  }

  function openModal(action: string) {
    setActiveModal(action);
    setComment("");
    setError("");
  }

  const config = activeModal ? ACTION_CONFIG[activeModal] : null;

  return (
    <>
      <div className="card p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</h3>
        <div className="space-y-2">
          {availableActions.map((action) => {
            const ac = ACTION_CONFIG[action];
            if (!ac) return null;
            return (
              <button
                key={action}
                id={`action-${action.toLowerCase()}`}
                onClick={() => openModal(action)}
                className={`${ac.className} w-full justify-center`}
              >
                {ac.icon}
                {ac.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action modal */}
      {activeModal && config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="card w-full max-w-md p-6 shadow-2xl" style={{ background: "#0f1a2e" }}>
            <h3 className="text-base font-bold text-white mb-1">{config.label}</h3>
            <p className="text-xs text-slate-500 mb-5">Permit {permitNumber}</p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {activeModal === "REQUEST_EXTENSION" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Extension duration (hours, max 8)
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={extHours}
                  onChange={(e) => setExtHours(parseInt(e.target.value))}
                  className="input"
                />
              </div>
            )}

            {config.needsComment && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {config.commentLabel}
                  {config.commentRequired && <span className="text-red-400 ml-1">*</span>}
                </label>
                <textarea
                  id={`modal-comment-${activeModal.toLowerCase()}`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder={config.commentRequired ? "Required" : "Optional"}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                id={`modal-confirm-${activeModal.toLowerCase()}`}
                onClick={() => executeAction(activeModal)}
                disabled={loading || (config.commentRequired && !comment.trim())}
                className={config.dangerous ? "btn-danger" : "btn-primary"}
              >
                {loading ? "Processing..." : config.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
