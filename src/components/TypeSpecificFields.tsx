"use client";

import { Flame, Users, ArrowUp, Zap } from "lucide-react";

interface Permit {
  type: string;
  hotWorkDetails: any;
  confinedSpaceDetails: any;
  heightWorkDetails: any;
  electricalLotoDetails: any;
}

export default function TypeSpecificFields({ permit }: { permit: Permit }) {
  const { type } = permit;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-4">
        {type === "HOT_WORK" && (
          <span className="inline-flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" /> Hot Work Safety Parameters
          </span>
        )}
        {type === "CONFINED_SPACE" && (
          <span className="inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" /> Confined Space Entry Controls
          </span>
        )}
        {type === "WORKING_AT_HEIGHT" && (
          <span className="inline-flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-blue-400" /> Height Work Fall Protection
          </span>
        )}
        {type === "ELECTRICAL_LOTO" && (
          <span className="inline-flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Electrical / LOTO Isolation
          </span>
        )}
      </h2>

      {type === "HOT_WORK" && permit.hotWorkDetails && (
        <HotWorkFields d={permit.hotWorkDetails} />
      )}
      {type === "CONFINED_SPACE" && permit.confinedSpaceDetails && (
        <ConfinedSpaceFields d={permit.confinedSpaceDetails} />
      )}
      {type === "WORKING_AT_HEIGHT" && permit.heightWorkDetails && (
        <HeightWorkFields d={permit.heightWorkDetails} />
      )}
      {type === "ELECTRICAL_LOTO" && permit.electricalLotoDetails && (
        <ElectricalLotoFields d={permit.electricalLotoDetails} />
      )}

      {!permit.hotWorkDetails &&
        !permit.confinedSpaceDetails &&
        !permit.heightWorkDetails &&
        !permit.electricalLotoDetails && (
          <p className="text-xs text-slate-500">
            Type-specific parameters not yet filled (permit is a draft).
          </p>
        )}
    </div>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) {
  const display =
    value === null || value === undefined ? (
      <span className="text-slate-600">—</span>
    ) : typeof value === "boolean" ? (
      <span className={value ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
        {value ? "Yes ✓" : "No ✗"}
      </span>
    ) : (
      String(value)
    );

  return (
    <div className="flex items-start justify-between py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="text-xs text-slate-400 flex-shrink-0 w-48">{label}</span>
      <span className="text-xs text-slate-200 font-medium text-right">{display}</span>
    </div>
  );
}

function HotWorkFields({ d }: { d: any }) {
  return (
    <div>
      <FieldRow label="Type of Hot Work" value={d.hotWorkType} />
      <FieldRow label="Fire Watch Assigned" value={d.fireWatchAssigned} />
      <FieldRow label="Extinguisher Present" value={d.extinguisherType} />
      <FieldRow label="Combustibles Cleared" value={`${d.combustiblesClearedM}m radius`} />
      <div
        className="mt-3 p-3.5 rounded-xl"
        style={{
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <p className="text-xs font-bold text-red-400 mb-2.5 uppercase tracking-wider">
          Gas Test Readings
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2.5 rounded-lg bg-black/40 border border-white/[0.05]">
            <p className="text-[0.7rem] text-slate-400 font-medium">LEL %</p>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                d.gasTestLel > 10
                  ? "text-red-400"
                  : d.gasTestLel > 5
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {d.gasTestLel}%
            </p>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">Threshold: &lt;10%</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-black/40 border border-white/[0.05]">
            <p className="text-[0.7rem] text-slate-400 font-medium">O₂ %</p>
            <p
              className={`text-xl font-bold font-mono mt-0.5 ${
                d.gasTestO2 < 19.5 || d.gasTestO2 > 23 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {d.gasTestO2}%
            </p>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">Safe: 19.5–23%</p>
          </div>
        </div>
        <p className="text-[0.7rem] text-slate-400 mt-2.5 font-mono">
          Tested by: <span className="text-slate-200">{d.gasTestedBy}</span> at{" "}
          {new Date(d.gasTestTime).toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

function ConfinedSpaceFields({ d }: { d: any }) {
  const entryLog = Array.isArray(d.entryExitLog) ? d.entryExitLog : [];
  return (
    <div>
      <FieldRow label="Space ID" value={d.spaceId} />
      <FieldRow label="Entry Point" value={d.entryPoint} />
      <FieldRow label="Standby Attendant" value={d.standbyAttendant} />
      <FieldRow label="Ventilation Method" value={d.ventilationMethod} />
      <FieldRow label="Rescue Plan" value={d.rescuePlan} />
      <div
        className="mt-3 p-3.5 rounded-xl"
        style={{
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.25)",
        }}
      >
        <p className="text-xs font-bold text-amber-400 mb-2.5 uppercase tracking-wider">
          Atmospheric Test Results
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "O₂", val: d.atmTestO2, unit: "%", safe: "19.5–23.5%" },
            { label: "LEL", val: d.atmTestLel, unit: "%", safe: "<10%" },
            { label: "H₂S", val: d.atmTestH2s, unit: "ppm", safe: "<1 ppm" },
            { label: "CO", val: d.atmTestCo, unit: "ppm", safe: "<25 ppm" },
          ].map(({ label, val, unit, safe }) => (
            <div
              key={label}
              className="text-center p-2.5 rounded-lg bg-black/40 border border-white/[0.05]"
            >
              <p className="text-[0.7rem] text-slate-400 font-medium">{label}</p>
              <p
                className={`text-lg font-bold font-mono mt-0.5 ${
                  label === "O₂" && (val < 19.5 || val > 23.5)
                    ? "text-red-400"
                    : label === "LEL" && val > 10
                    ? "text-red-400"
                    : label === "H₂S" && val > 1
                    ? "text-red-400"
                    : label === "CO" && val > 25
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {val} {unit}
              </p>
              <p className="text-[0.62rem] text-slate-500 mt-0.5">{safe}</p>
            </div>
          ))}
        </div>
        <p className="text-[0.7rem] text-slate-400 mt-2.5 font-mono">
          Tested by: <span className="text-slate-200">{d.atmTestedBy}</span> at{" "}
          {new Date(d.atmTestTime).toLocaleString("en-IN")}
        </p>
      </div>
      {entryLog.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">Entry / Exit Log</p>
          <div className="space-y-1.5">
            {entryLog.map((e: any, i: number) => (
              <div
                key={i}
                className="text-xs text-slate-300 flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]"
              >
                <span className="font-medium text-slate-200">{e.name}</span>
                <div className="text-[0.7rem] text-slate-400 font-mono space-x-3">
                  <span>In: {new Date(e.entryTime).toLocaleTimeString("en-IN")}</span>
                  {e.exitTime && (
                    <span>Out: {new Date(e.exitTime).toLocaleTimeString("en-IN")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HeightWorkFields({ d }: { d: any }) {
  return (
    <div>
      <FieldRow label="Height" value={`${d.heightMetres} metres`} />
      <FieldRow label="Access Method" value={d.accessMethod} />
      <FieldRow label="Fall Arrest Equipment" value={d.fallArrestEquip} />
      <FieldRow label="Anchor Point Checked" value={d.anchorChecked} />
      <FieldRow label="Barricading Below" value={d.barricadingBelow} />
    </div>
  );
}

function ElectricalLotoFields({ d }: { d: any }) {
  const isolationPoints = Array.isArray(d.isolationPoints) ? d.isolationPoints : [];
  return (
    <div>
      <FieldRow label="Equipment Tag" value={d.equipmentTag} />
      <FieldRow label="Voltage Level" value={d.voltageLevel} />
      <FieldRow label="Earthing Applied" value={d.earthingApplied} />
      <FieldRow label="Tested Dead By" value={d.testedDeadBy} />
      <FieldRow label="Lock Numbers" value={d.lockNumbers?.join(", ") ?? "—"} />
      <FieldRow label="Tag Numbers" value={d.tagNumbers?.join(", ") ?? "—"} />
      {isolationPoints.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">Isolation Points</p>
          <div className="space-y-1.5">
            {isolationPoints.map((ip: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-black/40 border border-white/[0.05]"
              >
                <span className="text-slate-200 font-mono">{ip.point}</span>
                <span
                  className={`font-semibold ${
                    ip.isolated ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {ip.isolated ? "✓ Isolated" : "✗ Not Isolated"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
