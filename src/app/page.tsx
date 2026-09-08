import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PermitCard from "@/components/PermitCard";
import DashboardFilters from "@/components/DashboardFilters";
import { Activity, Clock, AlertTriangle, FileCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

// This is a Server Component — we fetch directly from DB here
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
      <div className="p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Permit Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <Link href="/permits/new" id="new-permit-btn" className="btn-primary">
            <span className="text-lg leading-none">+</span>
            New Permit
          </Link>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            label="Active"
            value={activeCount}
            color="text-green-400"
            bg="rgba(34,197,94,0.08)"
            border="rgba(34,197,94,0.2)"
            icon={<Activity className="w-4 h-4" />}
          />
          <StatCard
            label="Expiring <2h"
            value={expiringSoonCount}
            color={expiringSoonCount > 0 ? "text-amber-400" : "text-slate-500"}
            bg={expiringSoonCount > 0 ? "rgba(245,158,11,0.08)" : "rgba(30,41,59,0.5)"}
            border={expiringSoonCount > 0 ? "rgba(245,158,11,0.3)" : "rgba(148,163,184,0.08)"}
            icon={<Clock className="w-4 h-4" />}
            urgent={expiringSoonCount > 0}
          />
          <StatCard
            label="Pending Approval"
            value={pendingCount}
            color="text-blue-400"
            bg="rgba(59,130,246,0.08)"
            border="rgba(59,130,246,0.2)"
            icon={<FileCheck className="w-4 h-4" />}
          />
          <StatCard
            label="Suspended"
            value={suspendedCount}
            color={suspendedCount > 0 ? "text-orange-400" : "text-slate-500"}
            bg={suspendedCount > 0 ? "rgba(249,115,22,0.08)" : "rgba(30,41,59,0.5)"}
            border={suspendedCount > 0 ? "rgba(249,115,22,0.3)" : "rgba(148,163,184,0.08)"}
            icon={<AlertTriangle className="w-4 h-4" />}
            urgent={suspendedCount > 0}
          />
          <StatCard
            label="My Approvals"
            value={myPendingCount}
            color={myPendingCount > 0 ? "text-blue-300" : "text-slate-500"}
            bg={myPendingCount > 0 ? "rgba(59,130,246,0.1)" : "rgba(30,41,59,0.5)"}
            border={myPendingCount > 0 ? "rgba(59,130,246,0.3)" : "rgba(148,163,184,0.08)"}
            icon={<FileCheck className="w-4 h-4" />}
            linkHref="/?myPending=true"
          />
        </div>

        {/* Filters */}
        <DashboardFilters areas={areas} currentFilters={searchParams} />

        {/* Permit grid */}
        {permits.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No permits match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
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
      className="p-4 rounded-xl flex items-center gap-3 transition-all"
      style={{ background: bg, border: `1px solid ${border}`, animation: urgent ? "pulse-amber 2s infinite" : "none" }}
    >
      <div className={`${color} opacity-80`}>{icon}</div>
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );

  if (linkHref) {
    return <Link href={linkHref}>{inner}</Link>;
  }
  return inner;
}
