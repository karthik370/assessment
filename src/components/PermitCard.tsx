"use client";

import { PermitStatus, PermitType } from "@prisma/client";
import { Flame, Users, ArrowUp, Zap, MapPin, Calendar, User } from "lucide-react";
import Link from "next/link";
import CountdownTimer from "./CountdownTimer";

const TYPE_ICONS: Record<PermitType, React.ReactNode> = {
  HOT_WORK: <Flame className="w-3.5 h-3.5" />,
  CONFINED_SPACE: <Users className="w-3.5 h-3.5" />,
  WORKING_AT_HEIGHT: <ArrowUp className="w-3.5 h-3.5" />,
  ELECTRICAL_LOTO: <Zap className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<PermitType, string> = {
  HOT_WORK: "Hot Work",
  CONFINED_SPACE: "Confined Space",
  WORKING_AT_HEIGHT: "Height Work",
  ELECTRICAL_LOTO: "Electrical / LOTO",
};

const STATUS_LABELS: Record<PermitStatus, string> = {
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

interface PermitCardProps {
  permit: {
    id: string;
    permitNumber: string;
    type: PermitType;
    status: PermitStatus;
    workDescription: string;
    locationDetail: string;
    plannedStart: string | Date;
    plannedEnd: string | Date;
    expiresAt: string | Date | null;
    requester: { name: string };
    area: { name: string };
    plant: { name: string; code: string };
    equipment?: { tag: string; name: string } | null;
  };
}

function isExpiringSoon(expiresAt: string | Date | null): boolean {
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 && ms < 2 * 60 * 60 * 1000; // < 2 hours
}

export default function PermitCard({ permit }: PermitCardProps) {
  const expiring = permit.status === "ACTIVE" && isExpiringSoon(permit.expiresAt);

  return (
    <Link href={`/permits/${permit.id}`} id={`permit-card-${permit.id}`} className="block group">
      <div
        className={`card card-hover p-5 transition-all duration-200 ${
          expiring ? "border-amber-400/40" : ""
        }`}
        style={
          expiring
            ? {
                boxShadow:
                  "0 0 0 1px rgba(251,191,36,0.35), 0 8px 30px rgba(251,191,36,0.15)",
              }
            : undefined
        }
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`type-badge type-${permit.type}`}>
                {TYPE_ICONS[permit.type]}
                {TYPE_LABELS[permit.type]}
              </span>
              {expiring && (
                <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold uppercase tracking-wider animate-pulse">
                  ⚠ Expiring Soon
                </span>
              )}
            </div>
            <code className="text-xs text-amber-400/80 font-mono font-medium">
              {permit.permitNumber}
            </code>
          </div>
          <span
            className={`status-badge status-${permit.status} ${
              expiring ? "expiring" : ""
            } flex-shrink-0`}
          >
            {STATUS_LABELS[permit.status]}
          </span>
        </div>

        {/* Work description */}
        <p className="text-sm font-medium text-slate-200 mb-3.5 line-clamp-2 leading-relaxed">
          {permit.workDescription}
        </p>

        {/* Location & info metadata */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/70" />
            <span className="truncate">
              {permit.plant.code} › {permit.area.name}
              {permit.equipment ? ` › ${permit.equipment.tag}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/70" />
            <span className="truncate">By {permit.requester.name}</span>
          </div>
        </div>

        {/* Timing and countdown row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {new Date(permit.plannedStart).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </span>
            <span className="text-slate-600">→</span>
            <span>
              {new Date(permit.plannedEnd).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {(permit.status === "ACTIVE" || permit.status === "APPROVED") && permit.expiresAt && (
            <CountdownTimer expiresAt={permit.expiresAt} size="sm" />
          )}
        </div>
      </div>
    </Link>
  );
}
