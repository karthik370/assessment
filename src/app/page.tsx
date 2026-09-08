import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PermitCard from "@/components/PermitCard";
import DashboardFilters from "@/components/DashboardFilters";
import { Activity, Clock, AlertTriangle, FileCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; areaId?: string; myPending?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Build filters from search params
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.areaId) where.areaId = searchParams.areaId;

  const userId = (session.user as any).id as string;

  if (searchParams.myPending === "true") {
    where.status = "PENDING_APPROVAL";
    where.approvals = { some: { approverId: userId, status: "PENDING" } };
  }

  const [permits, stats] = await Promise.all([
    prisma.permit.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        requester: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true } },
        equipment: { select: { id: true, tag: true, name: true } },
        approvals: true,
      },
    }),
    // Stats for summary cards
    Promise.all([
      prisma.permit.count({ where: { status: "ACTIVE" } }),
      prisma.permit.count({
        where: {
          status: "ACTIVE",
          expiresAt: { lt: new Date(Date.now() + 2 * 3600_000) },
        },
      }),
      prisma.permit.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.permit.count({ where: { status: "SUSPENDED" } }),
      prisma.permit.count({
        where: {
          status: "PENDING_APPROVAL",
          approvals: { some: { approverId: userId, status: "PENDING" } },
        },
      }),
    ]),
  ]);

  const [activeCount, expiringSoonCount, pendingCount, suspendedCount, myPendingCount] = stats;

  const areas = await prisma.area.findMany({
    include: { plant: { select: { code: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Permit Dashboard</span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 font-medium">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Link href="/permits/new" id="new-permit-btn" className="btn-primary">
            <span className="text-base leading-none">+</span>
            New Permit
          </Link>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
          <StatCard
            label="Active"
            value={activeCount}
            color="text-emerald-400"
            bg="rgba(16,185,129,0.06)"
            border="rgba(16,185,129,0.2)"
            icon={<Activity className="w-4 h-4 text-emerald-400" />}
          />
          <StatCard
            label="Expiring <2h"
            value={expiringSoonCount}
            color={expiringSoonCount > 0 ? "text-amber-400" : "text-slate-400"}
            bg={expiringSoonCount > 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.02)"}
            border={expiringSoonCount > 0 ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.06)"}
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            urgent={expiringSoonCount > 0}
          />
          <StatCard
            label="Pending Approval"
            value={pendingCount}
            color={pendingCount > 0 ? "text-amber-300" : "text-slate-400"}
            bg={pendingCount > 0 ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.02)"}
            border={pendingCount > 0 ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}
            icon={<FileCheck className="w-4 h-4 text-amber-300" />}
          />
          <StatCard
            label="Suspended"
            value={suspendedCount}
            color={suspendedCount > 0 ? "text-red-400" : "text-slate-400"}
            bg={suspendedCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)"}
            border={suspendedCount > 0 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}
            icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
            urgent={suspendedCount > 0}
          />
          <StatCard
            label="My Approvals"
            value={myPendingCount}
            color={myPendingCount > 0 ? "text-amber-400" : "text-slate-400"}
            bg={myPendingCount > 0 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.02)"}
            border={myPendingCount > 0 ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.06)"}
            icon={<CheckCircle2 className="w-4 h-4 text-amber-400" />}
            linkHref="/?myPending=true"
          />
        </div>

        {/* Filters */}
        <div className="card p-3 mb-5">
          <DashboardFilters areas={areas} currentFilters={searchParams} />
        </div>

        {/* Permit grid */}
        {permits.length === 0 ? (
          <div className="card text-center py-20 px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-6 h-6 text-amber-400/60" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No permits found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No permits match your active filters, or no permits have been created yet.
            </p>
            <Link href="/permits/new" className="btn-primary mt-4 inline-flex">
              Create First Permit
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {permits.map((permit) => (
              <PermitCard key={permit.id} permit={permit as any} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  border,
  icon,
  urgent,
  linkHref,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  urgent?: boolean;
  linkHref?: string;
}) {
  const inner = (
    <div
      className="p-4 rounded-2xl flex items-center gap-3.5 transition-all duration-200 relative overflow-hidden group card-hover cursor-pointer"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: urgent ? "0 0 20px rgba(251,191,36,0.15)" : "0 4px 16px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold font-mono leading-none ${color}`}>{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
      </div>
    </div>
  );

  if (linkHref) {
    return <Link href={linkHref} className="block">{inner}</Link>;
  }
  return inner;
}
