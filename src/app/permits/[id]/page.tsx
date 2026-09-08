import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PermitActions from "@/components/PermitActions";
import AuditLogTimeline from "@/components/AuditLogTimeline";
import ApprovalTrail from "@/components/ApprovalTrail";
import TypeSpecificFields from "@/components/TypeSpecificFields";
import CountdownTimer from "@/components/CountdownTimer";
import ExtensionPanel from "@/components/ExtensionPanel";
import { getAvailableActions } from "@/lib/permissions";
import {
  MapPin, Calendar, User, Users, FileText, Shield,
  ArrowLeft, QrCode, Flame, ArrowUp, Zap, Clock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", PENDING_APPROVAL: "Pending Approval", APPROVED: "Approved",
  ACTIVE: "Active", SUSPENDED: "Suspended", EXPIRED: "Expired",
  CLOSED: "Closed", CLOSED_VERIFIED: "Closed & Verified",
  REJECTED: "Rejected", CANCELLED: "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  HOT_WORK: "Hot Work", CONFINED_SPACE: "Confined Space Entry",
  WORKING_AT_HEIGHT: "Working at Height", ELECTRICAL_LOTO: "Electrical / LOTO",
};

export default async function PermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id as string;
  const userRole = (session.user as any).role as string;
  const ownedAreaIds = ((session.user as any).ownedAreaIds ?? []) as string[];

  const permit = await prisma.permit.findUnique({
    where: { id: (await params).id },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
      plant: true,
      area: true,
      equipment: true,
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      auditLogs: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { timestamp: "asc" },
      },
      hotWorkDetails: true,
      confinedSpaceDetails: true,
      heightWorkDetails: true,
      electricalLotoDetails: true,
      extensionRequests: {
        include: {
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!permit) notFound();

  const availableActions = getAvailableActions(
    { id: userId, role: userRole as any, ownedAreaIds },
    {
      permitStatus: permit.status,
      permitRequesterId: permit.requesterId,
      permitAreaId: permit.areaId,
      expiresAt: permit.expiresAt,
    }
  );

  const isExpiringSoon =
    permit.status === "ACTIVE" &&
    permit.expiresAt &&
    new Date(permit.expiresAt).getTime() - Date.now() < 2 * 3600_000;

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <code className="text-sm text-slate-400 font-mono">{permit.permitNumber}</code>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`type-badge type-${permit.type} text-sm py-1 px-3`}>
                {TYPE_LABELS[permit.type]}
              </span>
              <span className={`status-badge status-${permit.status} ${isExpiringSoon ? "expiring" : ""}`}>
                {STATUS_LABELS[permit.status]}
              </span>
              {permit.status === "ACTIVE" && permit.expiresAt && (
                <CountdownTimer expiresAt={permit.expiresAt} size="md" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">{permit.workDescription}</h1>
            <p className="text-sm text-slate-500 mt-1">
              <code className="font-mono">{permit.permitNumber}</code> · Raised {new Date(permit.createdAt).toLocaleString("en-IN")}
            </p>
          </div>

          {/* QR Code — safety walk-around can scan this */}
          <div className="flex-shrink-0">
            <a
              href={`/api/permits/${permit.id}/qr`}
              target="_blank"
              title="Download QR code for this permit"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </a>
            <img
              src={`/api/permits/${permit.id}/qr`}
              alt={`QR code for permit ${permit.permitNumber}`}
              width={80}
              height={80}
              className="rounded mt-1 border border-slate-700/50"
            />
          </div>
        </div>

        {/* Urgent banner for suspended */}
        {permit.status === "SUSPENDED" && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-orange-300">Work Suspended</p>
              <p className="text-xs text-orange-400/80">All work must stop immediately. See audit log for suspension reason.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Core info */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Permit Details</h2>
              <dl className="space-y-3">
                <DetailRow icon={<User className="w-4 h-4" />} label="Requester" value={`${permit.requester.name} (${permit.requester.email})`} />
                <DetailRow icon={<Users className="w-4 h-4" />} label="Contractor / Team" value={permit.contractorTeam} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={`${permit.plant.name} › ${permit.area.name}${permit.equipment ? ` › ${permit.equipment.tag} — ${permit.equipment.name}` : ""}`} />
                <DetailRow icon={<MapPin className="w-4 h-4 opacity-0" />} label="Exact Location" value={permit.locationDetail} />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Planned Window"
                  value={`${new Date(permit.plannedStart).toLocaleString("en-IN")} → ${new Date(permit.plannedEnd).toLocaleString("en-IN")}`}
                />
                {permit.expiresAt && (
                  <DetailRow icon={<Clock className="w-4 h-4" />} label="Expires At" value={new Date(permit.expiresAt).toLocaleString("en-IN")} />
                )}
              </dl>
            </div>

            {/* Hazards & PPE */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Hazards & Controls</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Hazards Identified</p>
                  {permit.hazardsIdentified.length > 0 ? (
                    <ul className="space-y-1">
                      {permit.hazardsIdentified.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-red-400 mt-0.5">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-600">None listed</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">PPE Required</p>
                  {permit.ppeRequired.length > 0 ? (
                    <ul className="space-y-1">
                      {permit.ppeRequired.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-600">None listed</p>}
                </div>
              </div>
            </div>

            {/* Type-specific fields */}
            <TypeSpecificFields permit={permit as any} />

            {/* Closure notes */}
            {permit.closureNotes && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Closure Notes</h2>
                <p className="text-sm text-slate-300">{permit.closureNotes}</p>
                {permit.closedAt && (
                  <p className="text-xs text-slate-600 mt-2">Closed: {new Date(permit.closedAt).toLocaleString("en-IN")}</p>
                )}
              </div>
            )}

            {permit.verifiedNotes && (
              <div className="card p-5" style={{ borderColor: "rgba(6,182,212,0.2)" }}>
                <h2 className="text-sm font-semibold text-cyan-500 uppercase tracking-wide mb-3">✓ Verified by Safety Officer</h2>
                <p className="text-sm text-slate-300">{permit.verifiedNotes}</p>
                {permit.verifiedAt && (
                  <p className="text-xs text-slate-600 mt-2">Verified: {new Date(permit.verifiedAt).toLocaleString("en-IN")}</p>
                )}
              </div>
            )}

            {/* Audit log */}
            <AuditLogTimeline logs={permit.auditLogs as any} />
          </div>

          {/* Right column — approvals + actions */}
          <div className="space-y-4">
            {/* Approval trail */}
            <ApprovalTrail approvals={permit.approvals as any} />

            {/* Extension requests */}
            {permit.extensionRequests.length > 0 && (
              <ExtensionPanel
                permitId={permit.id}
                extensions={permit.extensionRequests as any}
                userRole={userRole}
              />
            )}

            {/* Action buttons */}
            <PermitActions
              permitId={permit.id}
              permitNumber={permit.permitNumber}
              availableActions={availableActions}
              status={permit.status}
              expiresAt={permit.expiresAt as any}
              requesterId={permit.requesterId}
              currentUserId={userId}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-600 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500 mb-0.5">{label}</dt>
        <dd className="text-sm text-slate-200">{value}</dd>
      </div>
    </div>
  );
}
