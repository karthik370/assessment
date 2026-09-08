"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Filter, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CLOSED", label: "Closed" },
  { value: "CLOSED_VERIFIED", label: "Closed & Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "HOT_WORK", label: "Hot Work" },
  { value: "CONFINED_SPACE", label: "Confined Space" },
  { value: "WORKING_AT_HEIGHT", label: "Height Work" },
  { value: "ELECTRICAL_LOTO", label: "Electrical / LOTO" },
];

export default function DashboardFilters({
  areas,
  currentFilters,
}: {
  areas: { id: string; name: string; plant: { code: string } }[];
  currentFilters: { status?: string; type?: string; areaId?: string; myPending?: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasFilters = !!(currentFilters.status || currentFilters.type || currentFilters.areaId || currentFilters.myPending);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (currentFilters.status && key !== "status") params.set("status", currentFilters.status);
    if (currentFilters.type && key !== "type") params.set("type", currentFilters.type);
    if (currentFilters.areaId && key !== "areaId") params.set("areaId", currentFilters.areaId);
    if (value) params.set(key, value);
    startTransition(() => router.push(`/?${params.toString()}`));
  }

  function clearFilters() {
    startTransition(() => router.push("/"));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter:</span>
      </div>

      <select
        id="filter-status"
        value={currentFilters.status ?? ""}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="input py-1.5 text-xs w-auto pr-8"
        style={{ width: "auto", minWidth: "140px" }}
        disabled={isPending}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        id="filter-type"
        value={currentFilters.type ?? ""}
        onChange={(e) => updateFilter("type", e.target.value)}
        className="input py-1.5 text-xs w-auto pr-8"
        style={{ width: "auto", minWidth: "140px" }}
        disabled={isPending}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        id="filter-area"
        value={currentFilters.areaId ?? ""}
        onChange={(e) => updateFilter("areaId", e.target.value)}
        className="input py-1.5 text-xs w-auto pr-8"
        style={{ width: "auto", minWidth: "160px" }}
        disabled={isPending}
      >
        <option value="">All Areas</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.plant.code} › {a.name}</option>
        ))}
      </select>

      <button
        id="filter-my-pending"
        onClick={() => updateFilter("myPending", currentFilters.myPending === "true" ? "" : "true")}
        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
          currentFilters.myPending === "true"
            ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
            : "border-slate-700 text-slate-500 hover:text-slate-300"
        }`}
        disabled={isPending}
      >
        My approvals pending
      </button>

      {hasFilters && (
        <button
          id="filter-clear"
          onClick={clearFilters}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors ml-1"
          disabled={isPending}
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {isPending && <span className="text-xs text-slate-600 animate-pulse">Loading...</span>}
    </div>
  );
}
