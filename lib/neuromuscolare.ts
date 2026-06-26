// ============================================================================
// Valutazione neuromuscolare TESTÀRE — genera, in modo DETERMINISTICO dal
// profilo KPI dell'atleta, il referto completo nello stile del Season Report:
// batteria test con percentili, profilo Carico-Velocità (F-V), analisi delle
// simmetrie con bias direzionale, trend storico con contesti e commento tecnico.
// Mock coerente (sostituibile con i dati reali del DB), nessun dato personale.
// ============================================================================

import type { Athlete, PhysicalKpi } from "./types";
import { BATTERY, type BatteryDim, type TestDef } from "./tests";
import { tierOf } from "./perf";

// ---- RNG deterministico -----------------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** pseudo-random stabile in [0,1) per (atleta, chiave). */
const rand = (athleteId: string, key: string) => (hash(athleteId + "::" + key) % 100000) / 100000;
const clamp = (n: number, lo = 1, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const r1 = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// ---- Mappature --------------------------------------------------------------
const DIM_KPI: Record<BatteryDim, keyof PhysicalKpi | "mobilita"> = {
  Forza: "forza", Potenza: "potenza", Reattività: "reattivita", Stabilità: "simmetria", Mobilità: "mobilita",
};

/** Valore realistico del test in funzione del percentile (0–100). */
function valueFor(t: TestDef, pct: number): number {
  const f = pct / 100;
  switch (t.name) {
    case "1 RM": return Math.round(90 + f * 120);
    case "1 RM / peso": return r1(1.2 + f * 1.6, 2);
    case "IMTP": return Math.round(1800 + f * 1400);
    case "NORDIC": return Math.round(250 + f * 250);
    case "Squeeze sfigmomanometro": return Math.round(180 + f * 150);
    case "CMJ altezza": return r1(28 + f * 22);
    case "Single leg CMJ": return r1(22 + f * 18);
    case "Single leg hop": return r1(130 + f * 75);
    case "Single leg hop somma": return Math.round(2 * (130 + f * 75));
    case "Drop jump altezza": return r1(26 + f * 20);
    case "Single leg drop jump": return r1(16 + f * 14);
    case "RSI drop jump": return r1(1.0 + f * 1.6, 2);
    case "RSI single leg drop jump": return r1(0.9 + f * 1.3, 2);
    case "Knee to Wall": return r1(6 + f * 6);
    case "Deep Squat": return clamp(Math.round(1 + f * 2), 0, 3);
    default: return r1(f * 100);
  }
}

export interface TestRow extends TestDef { percentile: number; value: number; dx?: number; sx?: number; asym?: number; dominant?: "DX" | "SX" }
export interface FVProfile { slope: number; profile: string; indication: string; est1RM: number }
export interface SymRow { test: string; asym: number; dominant: "DX" | "SX" | "—" }
export interface Symmetry { rows: SymRow[]; bias: string; biasSide: "DX" | "SX" | null; ktwDx: number; ktwSx: number; risk: string }
export interface TrendSession { code: string; date: string; context: string; pIndex: number }
export interface NeuroReport {
  pIndex: number;
  tier: string;
  dims: { dim: BatteryDim; pct: number }[];
  battery: { dim: BatteryDim; rows: TestRow[] }[];
  fv: FVProfile;
  symmetry: Symmetry;
  trend: TrendSession[];
  comment: string;
  mobilita: number;
}

const DIM_ORDER: BatteryDim[] = ["Forza", "Potenza", "Reattività", "Mobilità"];
const CONTEXTS = ["Baseline", "Mid-season", "Monitoring", "Return to Sport", "Monitoring", "End-season"];

export function neuroReport(a: Athlete): NeuroReport {
  const k = a.profile;
  const mobilita = clamp(38 + rand(a.id, "mob") * 50);
  const dimPct = (dim: BatteryDim): number => {
    const key = DIM_KPI[dim];
    return key === "mobilita" ? mobilita : (k[key] as number);
  };

  // Batteria: percentile per test = dimensione ± jitter; bilaterali con asimmetria.
  const rows: TestRow[] = BATTERY.map((t) => {
    const base = dimPct(t.dim);
    const pct = clamp(base + (rand(a.id, t.name) - 0.5) * 18);
    const value = valueFor(t, pct);
    if (!t.bilateral) return { ...t, percentile: pct, value };
    const asym = r1(Math.max(0, (100 - k.simmetria) / 6 + (rand(a.id, t.name + "asym") - 0.4) * 6));
    const dominant: "DX" | "SX" = rand(a.id, t.name + "side") > 0.5 ? "DX" : "SX";
    const hi = value, lo = r1(value * (1 - asym / 100));
    return { ...t, percentile: pct, value, dominant, asym, dx: dominant === "DX" ? hi : lo, sx: dominant === "DX" ? lo : hi };
  });

  const battery = DIM_ORDER.map((dim) => ({ dim, rows: rows.filter((r) => r.dim === dim) }));
  const dims = DIM_ORDER.map((dim) => ({ dim, pct: dimPct(dim) }));

  // Profilo Carico-Velocità (F-V).
  const fvDelta = k.forza - k.potenza; // >0 forza-dominante (deficit velocità)
  const slope = r1(fvDelta / 100 + (rand(a.id, "fv") - 0.5) * 0.2, 2);
  const fv: FVProfile =
    fvDelta > 12
      ? { slope, profile: "Forza-dominante · deficit di velocità", indication: "Incrementa il lavoro di velocità e potenza (carichi bassi, alta velocità).", est1RM: valueFor(BATTERY[0], k.forza) }
      : fvDelta < -12
        ? { slope, profile: "Velocità-dominante · deficit di forza", indication: "Aumenta il lavoro di forza massimale (alti carichi, ≥85% 1RM).", est1RM: valueFor(BATTERY[0], k.forza) }
        : { slope, profile: "Equilibrio F-V · stimoli misti", indication: "Mantieni stimoli misti forza-velocità; periodizza in base agli obiettivi.", est1RM: valueFor(BATTERY[0], k.forza) };

  // Analisi delle simmetrie.
  const symTests = [
    { test: "CMJ SL", key: "Single leg CMJ" },
    { test: "Single Hop", key: "Single leg hop" },
    { test: "Drop Jump", key: "Single leg drop jump" },
    { test: "RSI", key: "RSI single leg drop jump" },
    { test: "KTW", key: "Knee to Wall" },
  ];
  const symRows: SymRow[] = symTests.map(({ test, key }) => {
    const row = rows.find((r) => r.name === key);
    return { test, asym: row?.asym ?? 0, dominant: (row?.asym ?? 0) < 1 ? "—" : (row?.dominant ?? "—") };
  });
  const dxN = symRows.filter((s) => s.dominant === "DX").length;
  const sxN = symRows.filter((s) => s.dominant === "SX").length;
  const biasSide = dxN >= 4 ? "DX" : sxN >= 4 ? "SX" : null;
  const bias = biasSide ? `Bias direzionale: ${biasSide === "DX" ? dxN : sxN}/5 test verso il lato ${biasSide === "DX" ? "destro" : "sinistro"}.` : "Nessun bias direzionale significativo.";
  const ktw = rows.find((r) => r.name === "Knee to Wall")!;
  const ktwDx = ktw.dx ?? ktw.value, ktwSx = ktw.sx ?? ktw.value;
  const ktwMin = Math.min(ktwDx, ktwSx);
  const risk = ktwMin < 6 ? `Knee to Wall ${r1(ktwMin)} cm: dorsiflessione limitata, rischio caviglia da gestire.` : ktwMin < 12 ? `Knee to Wall ${r1(ktwMin)} cm: fascia 6–12 cm, da monitorare nel tempo.` : `Knee to Wall ${r1(ktwMin)} cm: mobilità di caviglia adeguata.`;
  const symmetry: Symmetry = { rows: symRows, bias, biasSide, ktwDx, ktwSx, risk };

  // Trend storico (sessioni T0..Tn con contesto).
  const nSess = 4 + Math.floor(rand(a.id, "nsess") * 4); // 4–7
  const trend: TrendSession[] = [];
  for (let i = 0; i < nSess; i++) {
    const ago = (nSess - 1 - i);
    const d = new Date(Date.parse("2026-05-13") - ago * 62 * 86400000);
    const drift = (rand(a.id, "tr" + i) - 0.5) * 10;
    const pIndex = clamp(k.pIndex - (nSess - 1 - i) * 1.4 + drift);
    trend.push({ code: `T${i}`, date: d.toISOString().slice(0, 10), context: i === 0 ? "Baseline" : CONTEXTS[i % CONTEXTS.length], pIndex });
  }
  trend[trend.length - 1] = { ...trend[trend.length - 1], pIndex: k.pIndex };

  // Commento tecnico.
  const sorted = [...dims].sort((x, y) => y.pct - x.pct);
  const top = sorted[0], weak = sorted[sorted.length - 1];
  const sub25 = rows.filter((r) => r.percentile < 25).map((r) => `${r.name} (${r.percentile}°)`);
  const comment = [
    `${top.dim} è il punto di forza del profilo (${top.pct}°), con valori sopra la media normativa.`,
    `${weak.dim} (${weak.pct}°) rappresenta l'area prioritaria di sviluppo.`,
    sub25.length ? `Sotto il 25° percentile: ${sub25.slice(0, 4).join(", ")}.` : `Nessun test sotto il 25° percentile.`,
    risk,
    bias,
    `Profilo carico-velocità: ${fv.profile.toLowerCase()}. ${fv.indication} 1RM stimato ${fv.est1RM} kg.`,
  ].join(" ");

  return { pIndex: k.pIndex, tier: tierOf(k.pIndex), dims, battery, fv, symmetry, trend, comment, mobilita };
}
