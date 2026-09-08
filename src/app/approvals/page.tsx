import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ApprovalTrail from "@/components/ApprovalTrail";
import CountdownTimer from "@/components/CountdownTimer";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
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
        <div className="p-6 text-center mt-20">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500 text-sm">Requesters don't have approval responsibilities.</p>
          <Link href="/" className="btn-primary mt-4 inline-flex">Go to Dashboard</Link>
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
    orderBy: { submittedAt: "asc" }, // oldest first — don't let things wait
  });

  const TYPE_LABELS: Record<string, string> = {
    HOT_WORK: "Hot Work",
    CONFINED_SPACE: "Confined Space",
    WORKING_AT_HEIGHT: "Height Work",
    ELECTRICAL_LOTO: "Electrical / LOTO",
  };

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Pending Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pendingPermits.length === 0
              ? "No permits waiting for your approval."
              : `${pendingPermits.length} permit${pendingPermits.length !== 1 ? "s" : ""} require your approval`}
          </p>
        </div>

        {pendingPermits.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/30" />
            <p className="text-slate-500 text-sm">All caught up. No permits awaiting your decision.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPermits.map((permit) => (
              <div key={permit.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`type-badge type-${permit.type}`}>{TYPE_LABELS[permit.type]}</span>
                      <code className="text-xs text-slate-600 font-mono">{permit.permitNumber}</code>
                    </div>
                    <h3 className="text-base font-semibold text-white">{permit.workDescription}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {permit.plant.code} › {permit.area.name}
                      {permit.equipment ? ` › ${permit.equipment.tag}` : ""}
                      {" · "}By {permit.requester.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">Work window</p>
                    <p className="text-xs text-slate-300">
                      {new Date(permit.plannedStart).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(permit.plannedStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(permit.plannedEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {/* Location & description */}
                <div className="p-3 rounded-lg bg-slate-800/40 mb-4 text-sm">
                  <p className="text-slate-400">{permit.locationDetail}</p>
                </div>

                {/* Approval trail so far */}
                <ApprovalTrail approvals={permit.approvals as any} />

                {/* View full permit link */}
                <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-end">
                  <Link
                    href={`/permits/${permit.id}`}
                    id={`approve-view-${permit.id}`}
                    className="btn-primary"
                  >
                    <FileText className="w-4 h-4" />
                    Review & Approve / Reject
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
