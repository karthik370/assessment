"use client";

import { PermitStatus, PermitType } from "@prisma/client";
import { Flame, Users, ArrowUp, Zap, MapPin, Clock, User, Calendar } from "lucide-react";
import Link from "next/link";
import CountdownTimer from "./CountdownTimer";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<PermitType, React.ReactNode> = {
  HOT_WORK: <Flame className="w-4 h-4" />,
  CONFINED_SPACE: <Users className="w-4 h-4" />,
  WORKING_AT_HEIGHT: <ArrowUp className="w-4 h-4" />,
  ELECTRICAL_LOTO: <Zap className="w-4 h-4" />,
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
    <Link href={`/permits/${permit.id}`} id={`permit-card-${permit.id}`}>
      <div className={`card card-hover p-5 ${expiring ? "border-amber-500/30" : ""}`} style={expiring ? { boxShadow: "0 0 0 1px rgba(245,158,11,0.3), 0 4px 24px rgba(245,158,11,0.1)" } : {}}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`type-badge type-${permit.type}`}>
                {TYPE_ICONS[permit.type]}
                {TYPE_LABELS[permit.type]}
              </span>
              {expiring && (
                <span className="text-xs text-amber-400 font-semibold animate-pulse">⚠ Expiring Soon</span>
              )}
            </div>
            <code className="text-xs text-slate-500 font-mono">{permit.permitNumber}</code>
          </div>
          <span className={`status-badge status-${permit.status} ${expiring ? "expiring" : ""} flex-shrink-0`}>
            {STATUS_LABELS[permit.status]}
          </span>
        </div>

        {/* Work description */}
        <p className="text-sm text-slate-300 mb-3 line-clamp-2">{permit.workDescription}</p>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{permit.plant.code} › {permit.area.name}{permit.equipment ? ` › ${permit.equipment.tag}` : ""}</span>
        </div>

        {/* Requester */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <User className="w-3 h-3 flex-shrink-0" />
          <span>{permit.requester.name}</span>
        </div>

        {/* Timing row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{new Date(permit.plannedStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
            <span className="text-slate-700">→</span>
            <span>{new Date(permit.plannedEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {(permit.status === "ACTIVE" || permit.status === "APPROVED") && permit.expiresAt && (
            <CountdownTimer expiresAt={permit.expiresAt} size="sm" />
          )}
        </div>
      </div>
    </Link>
  );
}
