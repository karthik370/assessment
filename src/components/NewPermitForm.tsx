"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Flame, Users, ArrowUp, Zap, ChevronRight, ChevronLeft, Save } from "lucide-react";

type PermitType = "HOT_WORK" | "CONFINED_SPACE" | "WORKING_AT_HEIGHT" | "ELECTRICAL_LOTO";

const PERMIT_TYPES = [
  {
    id: "HOT_WORK" as PermitType,
    label: "Hot Work",
    desc: "Welding, grinding, cutting, soldering — open flame or spark generating",
    icon: <Flame className="w-6 h-6" />,
    color: "#f87171",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
  {
    id: "CONFINED_SPACE" as PermitType,
    label: "Confined Space Entry",
    desc: "Entry into tanks, vessels, sewers, or any space with restricted access",
    icon: <Users className="w-6 h-6" />,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
  },
  {
    id: "WORKING_AT_HEIGHT" as PermitType,
    label: "Working at Height",
    desc: "Scaffold, ladder, MEWP, or rope access above 2m",
    icon: <ArrowUp className="w-6 h-6" />,
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    id: "ELECTRICAL_LOTO" as PermitType,
    label: "Electrical / LOTO",
    desc: "Isolation, lockout/tagout, work on live or de-energised electrical systems",
    icon: <Zap className="w-6 h-6" />,
    color: "#d8b4fe",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
  },
];

const HAZARD_OPTIONS = [
  "Open flame", "Sparks", "Hot metal", "Flammable vapour", "Flammable liquid",
  "Oxygen deficiency", "Toxic gas", "Chemical exposure", "Fall from height",
  "Dropped objects", "Electrocution", "Arc flash", "Burns", "Eye injury",
  "Noise", "Engulfment", "Crush injury", "Asphyxiation",
];

const PPE_OPTIONS = [
  "Hard hat", "Safety boots", "High-visibility vest", "Safety glasses",
  "Face shield", "Welding shield", "Grinding shield", "Hearing protection",
  "Fire-resistant coverall", "Leather gloves", "Chemical-resistant gloves",
  "Insulating gloves", "Arc flash suit", "SCBA", "Half-face respirator",
  "Full body harness", "Rubber mat",
];

interface Plant {
  id: string;
  name: string;
  code: string;
  areas: {
    id: string;
    name: string;
    equipment: { id: string; tag: string; name: string }[];
  }[];
}

const STEPS = ["Type", "Details", "Type Fields", "Safety", "Review"];

export default function NewPermitForm({ plants }: { plants: Plant[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");

  // Core fields
  const [type, setType] = useState<PermitType | "">("");
  const [contractorTeam, setContractorTeam] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [plantId, setPlantId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  // Default: tomorrow 08:00 → 17:00 local time
  const [plannedStart, setPlannedStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    // datetime-local format: YYYY-MM-DDTHH:mm
    return d.toISOString().slice(0, 16);
  });
  const [plannedEnd, setPlannedEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [hazards, setHazards] = useState<string[]>([]);
  const [ppe, setPpe] = useState<string[]>([]);

  // Hot Work fields
  const [hwType, setHwType] = useState("welding");
  const [hwFireWatch, setHwFireWatch] = useState("");
  const [hwExtinguisher, setHwExtinguisher] = useState("");
  const [hwCombustibles, setHwCombustibles] = useState(10);
  const [hwLel, setHwLel] = useState(0);
  const [hwO2, setHwO2] = useState(20.9);
  const [hwTestTime, setHwTestTime] = useState("");
  const [hwTestedBy, setHwTestedBy] = useState("");

  // Confined Space fields
  const [csSpaceId, setCsSpaceId] = useState("");
  const [csEntryPoint, setCsEntryPoint] = useState("");
  const [csO2, setCsO2] = useState(20.9);
  const [csLel, setCsLel] = useState(0);
  const [csH2s, setCsH2s] = useState(0);
  const [csCo, setCsCo] = useState(0);
  const [csTestTime, setCsTestTime] = useState("");
  const [csTestedBy, setCsTestedBy] = useState("");
  const [csAttendant, setCsAttendant] = useState("");
  const [csRescue, setCsRescue] = useState("");
  const [csVentilation, setCsVentilation] = useState("");

  // Height Work fields
  const [hwHeight, setHwHeight] = useState(3);
  const [hwAccess, setHwAccess] = useState("scaffold");
  const [hwFallArrest, setHwFallArrest] = useState("");
  const [hwAnchorChecked, setHwAnchorChecked] = useState(false);
  const [hwBarricading, setHwBarricading] = useState(false);

  // LOTO fields
  const [loTag, setLoTag] = useState("");
  const [loVoltage, setLoVoltage] = useState("");
  const [loIsolationPoints, setLoIsolationPoints] = useState(""); // newline-separated
  const [loLocks, setLoLocks] = useState("");
  const [loTags, setLoTags] = useState("");
  const [loEarthing, setLoEarthing] = useState(false);
  const [loTestedBy, setLoTestedBy] = useState("");

  const selectedPlant = plants.find((p) => p.id === plantId);
  const selectedArea = selectedPlant?.areas.find((a) => a.id === areaId);

  function toggleHazard(h: string) {
    setHazards((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  function togglePpe(p: string) {
    setPpe((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function buildPayload() {
    // Guard — these should never be empty given defaults, but be safe
    const startDate = plannedStart ? new Date(plannedStart) : null;
    const endDate = plannedEnd ? new Date(plannedEnd) : null;
    if (!startDate || isNaN(startDate.getTime())) {
      throw new Error("Please select a valid planned start date and time.");
    }
    if (!endDate || isNaN(endDate.getTime())) {
      throw new Error("Please select a valid planned end date and time.");
    }
    if (endDate <= startDate) {
      throw new Error("Planned end must be after planned start.");
    }
    const base: any = {
      type,
      contractorTeam,
      workDescription,
      plantId,
      areaId,
      equipmentId: equipmentId || undefined,
      locationDetail,
      plannedStart: startDate.toISOString(),
      plannedEnd: endDate.toISOString(),
      hazardsIdentified: hazards,
      ppeRequired: ppe,
    };

    if (type === "HOT_WORK") {
      base.hotWork = {
        hotWorkType: hwType,
        fireWatchAssigned: hwFireWatch,
        extinguisherType: hwExtinguisher,
        combustiblesClearedM: hwCombustibles,
        gasTestLel: hwLel,
        gasTestO2: hwO2,
        gasTestTime: hwTestTime ? new Date(hwTestTime).toISOString() : new Date().toISOString(),
        gasTestedBy: hwTestedBy,
      };
    } else if (type === "CONFINED_SPACE") {
      base.confinedSpace = {
        spaceId: csSpaceId,
        entryPoint: csEntryPoint,
        atmTestO2: csO2,
        atmTestLel: csLel,
        atmTestH2s: csH2s,
        atmTestCo: csCo,
        atmTestTime: csTestTime ? new Date(csTestTime).toISOString() : new Date().toISOString(),
        atmTestedBy: csTestedBy,
        standbyAttendant: csAttendant,
        rescuePlan: csRescue,
        ventilationMethod: csVentilation,
      };
    } else if (type === "WORKING_AT_HEIGHT") {
      base.heightWork = {
        heightMetres: hwHeight,
        accessMethod: hwAccess,
        fallArrestEquip: hwFallArrest,
        anchorChecked: hwAnchorChecked,
        barricadingBelow: hwBarricading,
      };
    } else if (type === "ELECTRICAL_LOTO") {
      base.electricalLoto = {
        equipmentTag: loTag,
        voltageLevel: loVoltage,
        isolationPoints: loIsolationPoints
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => ({ point: l.trim(), isolated: true })),
        lockNumbers: loLocks.split(",").map((s) => s.trim()).filter(Boolean),
        tagNumbers: loTags.split(",").map((s) => s.trim()).filter(Boolean),
        earthingApplied: loEarthing,
        testedDeadBy: loTestedBy,
      };
    }

    return base;
  }

  async function submitForm() {
    setSubmitting(true);
    setError("");

    let payload;
    try {
      payload = buildPayload();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.status === 409) {
      const data = await res.json();
      setConflictWarning(data.warning);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const { permit } = await res.json();
    router.push(`/permits/${permit.id}`);
  }

  const stepComponents = [
    // Step 0: Type selection
    <div key="type">
      <p className="text-sm text-slate-400 mb-4">Select the type of work requiring authorisation.</p>
      <div className="space-y-3">
        {PERMIT_TYPES.map((pt) => (
          <button
            key={pt.id}
            id={`type-${pt.id.toLowerCase()}`}
            type="button"
            onClick={() => { setType(pt.id); setStep(1); }}
            className="w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4"
            style={{
              background: type === pt.id ? pt.bg : "rgba(255,255,255,0.02)",
              borderColor: type === pt.id ? pt.color : "rgba(255,255,255,0.05)",
              boxShadow: type === pt.id ? `0 0 0 1px ${pt.color}40` : "none",
            }}
          >
            <span style={{ color: pt.color }}>{pt.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">{pt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{pt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Common details
    <div key="details" className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Contractor / Team performing work <span className="text-red-400">*</span></label>
        <input className="input" value={contractorTeam} onChange={(e) => setContractorTeam(e.target.value)} placeholder="e.g. Vijay Fabricators Pvt Ltd" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Work Description <span className="text-red-400">*</span></label>
        <textarea className="input resize-none" rows={3} value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="Describe exactly what work will be done..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Plant <span className="text-red-400">*</span></label>
          <select className="input" value={plantId} onChange={(e) => { setPlantId(e.target.value); setAreaId(""); setEquipmentId(""); }}>
            <option value="">Select plant...</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Area <span className="text-red-400">*</span></label>
          <select className="input" value={areaId} onChange={(e) => { setAreaId(e.target.value); setEquipmentId(""); }} disabled={!plantId}>
            <option value="">Select area...</option>
            {selectedPlant?.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Equipment (optional)</label>
        <select className="input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} disabled={!areaId}>
          <option value="">No specific equipment</option>
          {selectedArea?.equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.tag} — {eq.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Exact Location <span className="text-red-400">*</span></label>
        <input className="input" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="e.g. North side of pump plinth, near pipe rack 3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Planned Start <span className="text-red-400">*</span></label>
          <input type="datetime-local" className="input" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Planned End <span className="text-red-400">*</span></label>
          <input type="datetime-local" className="input" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
        </div>
      </div>
    </div>,

    // Step 2: Type-specific fields
    <div key="typefields" className="space-y-4">
      {type === "HOT_WORK" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Type of Hot Work</label>
              <select className="input" value={hwType} onChange={(e) => setHwType(e.target.value)}>
                <option value="welding">Welding</option>
                <option value="grinding">Grinding</option>
                <option value="cutting">Cutting</option>
                <option value="soldering">Soldering</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Combustibles Cleared (m radius)</label>
              <input type="number" className="input" value={hwCombustibles} onChange={(e) => setHwCombustibles(Number(e.target.value))} min={0} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fire Watch Assigned</label>
              <input className="input" value={hwFireWatch} onChange={(e) => setHwFireWatch(e.target.value)} placeholder="Name of fire watch person" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Extinguisher Present</label>
              <input className="input" value={hwExtinguisher} onChange={(e) => setHwExtinguisher(e.target.value)} placeholder="e.g. CO2 9kg" />
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-xs font-semibold text-red-400 mb-3">Gas Test Readings</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">LEL % (must be &lt;10%)</label>
                <input type="number" className="input" value={hwLel} onChange={(e) => setHwLel(Number(e.target.value))} min={0} max={100} step={0.1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">O₂ % (safe: 19.5–23%)</label>
                <input type="number" className="input" value={hwO2} onChange={(e) => setHwO2(Number(e.target.value))} min={0} max={100} step={0.1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Test Time</label>
                <input type="datetime-local" className="input" value={hwTestTime} onChange={(e) => setHwTestTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tested By</label>
                <input className="input" value={hwTestedBy} onChange={(e) => setHwTestedBy(e.target.value)} placeholder="Name of tester" />
              </div>
            </div>
          </div>
        </>
      )}

      {type === "CONFINED_SPACE" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Space ID</label>
              <input className="input" value={csSpaceId} onChange={(e) => setCsSpaceId(e.target.value)} placeholder="e.g. CR-TK-003-INT" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Entry Point</label>
              <input className="input" value={csEntryPoint} onChange={(e) => setCsEntryPoint(e.target.value)} placeholder="e.g. Top manway (900mm dia)" />
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}>
            <p className="text-xs font-semibold text-yellow-400 mb-3">Atmospheric Test Results</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">O₂ % (safe: 19.5–23.5%)</label>
                <input type="number" className="input" value={csO2} onChange={(e) => setCsO2(Number(e.target.value))} step={0.1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">LEL % (must be &lt;10%)</label>
                <input type="number" className="input" value={csLel} onChange={(e) => setCsLel(Number(e.target.value))} step={0.1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">H₂S ppm (safe: &lt;1 ppm)</label>
                <input type="number" className="input" value={csH2s} onChange={(e) => setCsH2s(Number(e.target.value))} step={0.1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">CO ppm (safe: &lt;25 ppm)</label>
                <input type="number" className="input" value={csCo} onChange={(e) => setCsCo(Number(e.target.value))} step={0.1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Test Time</label>
                <input type="datetime-local" className="input" value={csTestTime} onChange={(e) => setCsTestTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tested By</label>
                <input className="input" value={csTestedBy} onChange={(e) => setCsTestedBy(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Standby Attendant Name</label>
            <input className="input" value={csAttendant} onChange={(e) => setCsAttendant(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Rescue Plan</label>
            <textarea className="input resize-none" rows={2} value={csRescue} onChange={(e) => setCsRescue(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Ventilation Method</label>
            <input className="input" value={csVentilation} onChange={(e) => setCsVentilation(e.target.value)} placeholder="e.g. Forced air blower, continuous" />
          </div>
        </>
      )}

      {type === "WORKING_AT_HEIGHT" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Height (metres)</label>
              <input type="number" className="input" value={hwHeight} onChange={(e) => setHwHeight(Number(e.target.value))} min={2} step={0.5} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Access Method</label>
              <select className="input" value={hwAccess} onChange={(e) => setHwAccess(e.target.value)}>
                <option value="scaffold">Scaffold</option>
                <option value="ladder">Ladder</option>
                <option value="MEWP">MEWP (Cherry picker)</option>
                <option value="rope">Rope access</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fall Arrest Equipment</label>
            <input className="input" value={hwFallArrest} onChange={(e) => setHwFallArrest(e.target.value)} placeholder="e.g. Full body harness EN361, double lanyard" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={hwAnchorChecked} onChange={(e) => setHwAnchorChecked(e.target.checked)} className="rounded" />
              Anchor point checked
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={hwBarricading} onChange={(e) => setHwBarricading(e.target.checked)} className="rounded" />
              Barricading below
            </label>
          </div>
        </>
      )}

      {type === "ELECTRICAL_LOTO" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Equipment Tag</label>
              <input className="input" value={loTag} onChange={(e) => setLoTag(e.target.value)} placeholder="e.g. VZ-ES-001-CB-B3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Voltage Level</label>
              <input className="input" value={loVoltage} onChange={(e) => setLoVoltage(e.target.value)} placeholder="e.g. 415V, 11kV" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Isolation Points (one per line)</label>
            <textarea className="input resize-none font-mono text-xs" rows={4} value={loIsolationPoints} onChange={(e) => setLoIsolationPoints(e.target.value)} placeholder={"Incomer CB-B3 (11kV)\nBus coupler CB-BC1\nOutgoing feeder F-31"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Lock Numbers (comma-separated)</label>
              <input className="input font-mono text-xs" value={loLocks} onChange={(e) => setLoLocks(e.target.value)} placeholder="LOK-0041, LOK-0042" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tag Numbers (comma-separated)</label>
              <input className="input font-mono text-xs" value={loTags} onChange={(e) => setLoTags(e.target.value)} placeholder="TAG-2024-091, TAG-2024-092" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tested Dead By</label>
            <input className="input" value={loTestedBy} onChange={(e) => setLoTestedBy(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={loEarthing} onChange={(e) => setLoEarthing(e.target.checked)} />
            Earthing applied
          </label>
        </>
      )}
    </div>,

    // Step 3: Hazards & PPE
    <div key="safety" className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-3">Hazards Identified (select all that apply)</p>
        <div className="flex flex-wrap gap-2">
          {HAZARD_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggleHazard(h)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: hazards.includes(h) ? "rgba(239,68,68,0.15)" : "transparent",
                borderColor: hazards.includes(h) ? "#ef4444" : "rgba(148,163,184,0.15)",
                color: hazards.includes(h) ? "#f87171" : "#64748b",
              }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-3">PPE Required</p>
        <div className="flex flex-wrap gap-2">
          {PPE_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePpe(p)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: ppe.includes(p) ? "rgba(34,197,94,0.12)" : "transparent",
                borderColor: ppe.includes(p) ? "#22c55e" : "rgba(148,163,184,0.15)",
                color: ppe.includes(p) ? "#4ade80" : "#64748b",
              }}
            >
              {ppe.includes(p) ? "✓ " : ""}{p}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 4: Review
    <div key="review" className="space-y-4">
      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Permit Summary Review</p>
        <dl className="space-y-2 text-sm">
          <ReviewRow label="Type" value={PERMIT_TYPES.find((t) => t.id === type)?.label ?? ""} />
          <ReviewRow label="Contractor" value={contractorTeam} />
          <ReviewRow label="Work" value={workDescription} />
          <ReviewRow label="Location" value={locationDetail} />
          <ReviewRow label="Start" value={plannedStart ? new Date(plannedStart).toLocaleString("en-IN") : "—"} />
          <ReviewRow label="End" value={plannedEnd ? new Date(plannedEnd).toLocaleString("en-IN") : "—"} />
          <ReviewRow label="Hazards" value={hazards.join(", ") || "None selected"} />
          <ReviewRow label="PPE" value={ppe.join(", ") || "None selected"} />
        </dl>
      </div>

      {conflictWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-300">Simultaneous Work Conflict Detected</p>
            <p className="text-xs mt-1 text-slate-300 leading-relaxed">{conflictWarning}</p>
            <p className="text-[0.7rem] mt-2 text-amber-400/80 font-medium">You can still save as draft. The Area Owner and Safety Officer should review this conflict before authorizing.</p>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Saving as draft will not notify anyone. Submit when you're ready to send for approval.
      </p>
    </div>,
  ];

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className="step-dot cursor-pointer"
                style={{
                  background: i < step ? "#fbbf24" : i === step ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)",
                  color: i < step ? "#000000" : i === step ? "#fbbf24" : "#64748b",
                  border: i === step ? "2px solid #fbbf24" : i < step ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: i === step ? "0 0 15px rgba(251,191,36,0.35)" : "none",
                  fontWeight: 700,
                }}
                onClick={() => i < step && setStep(i)}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${i === step ? "text-amber-400" : i < step ? "text-slate-300" : "text-slate-600"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="step-line mx-2" style={{ background: i < step ? "#fbbf24" : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Current step */}
      <div className="card p-6 mb-5">{stepComponents[step]}</div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-ghost"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex gap-2">
          {step === STEPS.length - 1 ? (
            <>
              <button
                type="button"
                id="save-draft-btn"
                onClick={submitForm}
                disabled={savingDraft || submitting || !type}
                className="btn-ghost"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                type="button"
                id="submit-permit-btn"
                onClick={submitForm}
                disabled={submitting || !type}
                className="btn-primary"
              >
                {submitting ? "Creating..." : "Create & Submit"}
              </button>
            </>
          ) : (
            <button
              type="button"
              id={`step-next-${step}`}
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !type}
              className="btn-primary"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500 w-24 flex-shrink-0">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
