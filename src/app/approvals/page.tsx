import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ApprovalTrail from "@/components/ApprovalTrail";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id as string;
  const userRole = (session.user as any).role as string;

  // Requesters don't approve anything
  if (userRole === "REQUESTER") {
    return (
      <AppShell>
        <div className="p-6 max-w-lg mx-auto text-center mt-20">
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Requester Workspace</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-5">
              Requesters raise and manage permits, but do not have approval authorization.
            </p>
            <Link href="/" className="btn-primary inline-flex">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Find permits needing this user's approval
  const pendingPermits = await prisma.permit.findMany({
    where: {
      status: "PENDING_APPROVAL",
      approvals: {
        some: {
          approverId: userId,
          status: "PENDING",
        },
      },
    },
    include: {
      requester: { select: { name: true, email: true } },
      plant: { select: { name: true, code: true } },
      area: { select: { name: true } },
      equipment: { select: { tag: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true } } },
      },
      hotWorkDetails: true,
      confinedSpaceDetails: true,
      heightWorkDetails: true,
      electricalLotoDetails: true,
    },
    orderBy: { submittedAt: "asc" }, // oldest first
  });

  const TYPE_LABELS: Record<string, string> = {
    HOT_WORK: "Hot Work",
    CONFINED_SPACE: "Confined Space",
    WORKING_AT_HEIGHT: "Height Work",
    ELECTRICAL_LOTO: "Electrical / LOTO",
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Pending Approvals</span>
            {pendingPermits.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono font-bold">
                {pendingPermits.length} Action{pendingPermits.length !== 1 ? "s" : ""} Required
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {pendingPermits.length === 0
              ? "All permit approvals up to date."
              : `${pendingPermits.length} permit${
                  pendingPermits.length !== 1 ? "s" : ""
                } awaiting your review and authorization.`}
          </p>
        </div>

        {pendingPermits.length === 0 ? (
          <div className="card text-center py-20 px-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">
              No permits are currently awaiting your decision.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPermits.map((permit) => (
              <div
                key={permit.id}
                className="card p-5 border-amber-400/20 hover:border-amber-400/35 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`type-badge type-${permit.type}`}>
                        {TYPE_LABELS[permit.type]}
                      </span>
                      <code className="text-xs text-amber-400/80 font-mono font-medium">
                        {permit.permitNumber}
                      </code>
                    </div>
                    <h3 className="text-base font-bold text-white">{permit.workDescription}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {permit.plant.code} › {permit.area.name}
                      {permit.equipment ? ` › ${permit.equipment.tag}` : ""}
                      {" · "}Requested by{" "}
                      <span className="text-slate-200 font-medium">{permit.requester.name}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
                    <p className="text-[0.7rem] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                      Work Window
                    </p>
                    <p className="text-xs font-semibold text-slate-200">
                      {new Date(permit.plannedStart).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[0.7rem] text-slate-400 font-mono mt-0.5">
                      {new Date(permit.plannedStart).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(permit.plannedEnd).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Location & description snippet */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.05] mb-4 text-xs">
                  <span className="text-slate-500 font-medium mr-2">Exact Location:</span>
                  <span className="text-slate-300">{permit.locationDetail}</span>
                </div>

                {/* Approval trail so far */}
                <ApprovalTrail approvals={permit.approvals as any} />

                {/* Action button */}
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-end">
                  <Link
                    href={`/permits/${permit.id}`}
                    id={`approve-view-${permit.id}`}
                    className="btn-primary"
                  >
                    <FileText className="w-4 h-4" />
                    Review & Authorize
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
