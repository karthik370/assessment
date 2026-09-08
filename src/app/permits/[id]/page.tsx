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
  MapPin,
  Calendar,
  User,
  Users,
  ArrowLeft,
  QrCode,
  Clock,
  Shield,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
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

const TYPE_LABELS: Record<string, string> = {
  HOT_WORK: "Hot Work",
  CONFINED_SPACE: "Confined Space Entry",
  WORKING_AT_HEIGHT: "Working at Height",
  ELECTRICAL_LOTO: "Electrical / LOTO",
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
      <div className="p-6 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5 text-xs">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <code className="text-amber-400/90 font-mono font-medium">{permit.permitNumber}</code>
        </div>

        {/* Header banner */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`type-badge type-${permit.type} text-xs py-1 px-3`}>
                {TYPE_LABELS[permit.type]}
              </span>
              <span
                className={`status-badge status-${permit.status} ${
                  isExpiringSoon ? "expiring" : ""
                }`}
              >
                {STATUS_LABELS[permit.status]}
              </span>
              {permit.status === "ACTIVE" && permit.expiresAt && (
                <CountdownTimer expiresAt={permit.expiresAt} size="md" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {permit.workDescription}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              <code className="font-mono text-amber-400/90 font-semibold">{permit.permitNumber}</code>{" "}
              · Raised {new Date(permit.createdAt).toLocaleString("en-IN")}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 card p-2 flex flex-col items-center border-amber-400/20">
            <a
              href={`/api/permits/${permit.id}/qr`}
              target="_blank"
              title="Download QR code for this permit"
              className="flex items-center gap-1.5 text-[0.7rem] text-slate-400 hover:text-amber-400 transition-colors mb-1.5 font-medium"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              Inspection QR
            </a>
            <img
              src={`/api/permits/${permit.id}/qr`}
              alt={`QR code for permit ${permit.permitNumber}`}
              width={80}
              height={80}
              className="rounded-lg border border-white/[0.08]"
            />
          </div>
        </div>

        {/* Urgent banner for suspended state */}
        {permit.status === "SUSPENDED" && (
          <div
            className="flex items-center gap-3 p-4 rounded-2xl mb-5"
            style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.35)",
              boxShadow: "0 0 20px rgba(249,115,22,0.1)",
            }}
          >
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-300">Work Suspended</p>
              <p className="text-xs text-orange-400/80">
                All work operations must stop immediately. Refer to the audit log below for the suspension reason.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Core info card */}
            <div className="card p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-4 flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                Permit Details
              </h2>
              <dl className="space-y-3">
                <DetailRow
                  icon={<User className="w-4 h-4 text-amber-400/70" />}
                  label="Requester"
                  value={`${permit.requester.name} (${permit.requester.email})`}
                />
                <DetailRow
                  icon={<Users className="w-4 h-4 text-amber-400/70" />}
                  label="Contractor / Working Team"
                  value={permit.contractorTeam}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-amber-400/70" />}
                  label="Designated Location"
                  value={`${permit.plant.name} › ${permit.area.name}${
                    permit.equipment ? ` › ${permit.equipment.tag} — ${permit.equipment.name}` : ""
                  }`}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 opacity-0" />}
                  label="Exact Location Details"
                  value={permit.locationDetail}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4 text-amber-400/70" />}
                  label="Planned Work Window"
                  value={`${new Date(permit.plannedStart).toLocaleString("en-IN")} → ${new Date(
                    permit.plannedEnd
                  ).toLocaleString("en-IN")}`}
                />
                {permit.expiresAt && (
                  <DetailRow
                    icon={<Clock className="w-4 h-4 text-amber-400" />}
                    label="Permit Expiration"
                    value={new Date(permit.expiresAt).toLocaleString("en-IN")}
                  />
                )}
              </dl>
            </div>

            {/* Hazards & Controls card */}
            <div className="card p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-4 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Hazards & Safety Controls
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">Hazards Identified</p>
                  {permit.hazardsIdentified.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {permit.hazardsIdentified.map((h, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">None declared</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2">PPE Required</p>
                  {permit.ppeRequired.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {permit.ppeRequired.map((p, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5"
                        >
                          <span className="text-emerald-400">✓</span>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">None declared</p>
                  )}
                </div>
              </div>
            </div>

            {/* Type-specific satellite fields */}
            <TypeSpecificFields permit={permit as any} />

            {/* Closure notes */}
            {permit.closureNotes && (
              <div className="card p-5 border-purple-400/20">
                <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
                  <span>Work Completion Notes</span>
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">{permit.closureNotes}</p>
                {permit.closedAt && (
                  <p className="text-[0.7rem] text-slate-500 mt-2 font-mono">
                    Closed on: {new Date(permit.closedAt).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            )}

            {/* Verification notes */}
            {permit.verifiedNotes && (
              <div
                className="card p-5"
                style={{
                  border: "1px solid rgba(34,211,238,0.25)",
                  background: "rgba(34,211,238,0.03)",
                }}
              >
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <span>✓ Verified by Safety Officer</span>
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">{permit.verifiedNotes}</p>
                {permit.verifiedAt && (
                  <p className="text-[0.7rem] text-slate-500 mt-2 font-mono">
                    Verified on: {new Date(permit.verifiedAt).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            )}

            {/* Audit log timeline */}
            <AuditLogTimeline logs={permit.auditLogs as any} />
          </div>

          {/* Right column — approvals & interactive actions */}
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
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[0.7rem] text-slate-400 font-medium mb-0.5">{label}</dt>
        <dd className="text-sm text-slate-200 font-medium">{value}</dd>
      </div>
    </div>
  );
}
