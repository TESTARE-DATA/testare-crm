// ============================================================================
// Piano di Allenamento — periodizzazione a lungo termine.
// Modulo PURO (importabile lato client): costanti, seed di default e helper
// temporali. La struttura (settimane) è DERIVATA dalla stagione; in localStorage
// salviamo solo gli override (mesocicli, focus settimana/giorno) — "tutto si parla":
// le partite arrivano dal Calendario (codifica MD in lib/microcycle.ts), gli
// obiettivi dalla tassonomia ufficiale in lib/objectives.ts.
// ============================================================================

import type { MesocycleType, PlanIntensity, Mesocycle, PlanMeta } from "./types";

const DAY = 86400000;
// Calcoli interamente in UTC: niente drift da fuso orario / ora legale.
const toMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
export const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** Metadati dei tipi di mesociclo (etichetta + colore). */
export const MESO_META: Record<MesocycleType, { label: string; color: string }> = {
  preparazione: { label: "Preparazione", color: "#16a34a" },
  competitivo: { label: "Competitivo", color: "#dc2626" },
  richiamo: { label: "Richiamo forza", color: "#7c3aed" },
  scarico: { label: "Scarico / Tapering", color: "#0891b2" },
  transizione: { label: "Transizione", color: "#94a3b8" },
};
export const MESO_TYPES = Object.keys(MESO_META) as MesocycleType[];

/** Livelli di carico settimanale (etichetta + colore + % indicativa). */
export const INTENSITY_META: Record<PlanIntensity, { label: string; color: string; pct: number }> = {
  scarico: { label: "Scarico", color: "#0891b2", pct: 35 },
  medio: { label: "Medio", color: "#16a34a", pct: 60 },
  carico: { label: "Carico", color: "#d97706", pct: 85 },
  picco: { label: "Picco", color: "#dc2626", pct: 100 },
};
export const INTENSITY_LEVELS = Object.keys(INTENSITY_META) as PlanIntensity[];

/** Stagione di default (calcistica 2025/26). */
export function defaultMeta(clientId: string): PlanMeta {
  return { id: "meta", clientId, name: "Stagione 2025/26", seasonStart: "2025-07-07", seasonEnd: "2026-06-28" };
}

/** Mesocicli di default: scheletro sensato di una stagione di Serie A. */
export function defaultMesocycles(clientId: string): Mesocycle[] {
  return [
    { id: "meso-prep", clientId, name: "Preparazione precampionato", type: "preparazione", startDate: "2025-07-07", endDate: "2025-08-17", focus: "Costruzione condizione + identità di gioco" },
    { id: "meso-and", clientId, name: "Competitivo · girone d'andata", type: "competitivo", startDate: "2025-08-18", endDate: "2025-12-21", focus: "Mantenimento e rifinitura settimanale su gara" },
    { id: "meso-sosta", clientId, name: "Sosta invernale · richiamo", type: "richiamo", startDate: "2025-12-22", endDate: "2026-01-04", focus: "Richiamo forza e ricarica" },
    { id: "meso-rit", clientId, name: "Competitivo · girone di ritorno", type: "competitivo", startDate: "2026-01-05", endDate: "2026-05-24", focus: "Gestione carico e picco prestativo" },
    { id: "meso-fin", clientId, name: "Finale di stagione · transizione", type: "transizione", startDate: "2026-05-25", endDate: "2026-06-28", focus: "Scarico e bilancio stagionale" },
  ];
}

/** Lunedì (ISO) della settimana che contiene la data. */
export function isoMonday(iso: string): string {
  const d = new Date(toMs(iso));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunedì
  d.setUTCDate(d.getUTCDate() - dow);
  return toISO(d);
}

export function addDaysISO(iso: string, n: number): string {
  return toISO(new Date(toMs(iso) + n * DAY));
}

export interface PlanWeekSlot {
  id: string; // lunedì ISO
  weekStart: string; // lunedì ISO
  weekEnd: string; // domenica ISO
  index: number; // numero progressivo (1-based) nella stagione
  days: string[]; // 7 date ISO (Lun→Dom)
}

/** Genera le settimane (microcicli) della stagione, da lunedì a lunedì. */
export function generateWeeks(seasonStart: string, seasonEnd: string): PlanWeekSlot[] {
  const start = toMs(isoMonday(seasonStart));
  const end = toMs(seasonEnd);
  const out: PlanWeekSlot[] = [];
  let i = 0;
  for (let ms = start; ms <= end; ms += 7 * DAY) {
    const weekStart = toISO(new Date(ms));
    const days = Array.from({ length: 7 }, (_, k) => toISO(new Date(ms + k * DAY)));
    out.push({ id: weekStart, weekStart, weekEnd: days[6], index: ++i, days });
    if (i > 70) break; // guardia anti-loop
  }
  return out;
}

/** Mesociclo che contiene una certa settimana (per lunedì ISO). */
export function mesoForDate(date: string, mesos: Mesocycle[]): Mesocycle | undefined {
  const d = toMs(date);
  return mesos.find((m) => d >= toMs(m.startDate) && d <= toMs(m.endDate));
}

/** Posizione percentuale (0–100) di una data nell'arco della stagione. */
export function seasonPct(date: string, meta: PlanMeta): number {
  const a = toMs(meta.seasonStart);
  const b = toMs(meta.seasonEnd);
  const d = toMs(date);
  if (b <= a) return 0;
  return Math.max(0, Math.min(100, ((d - a) / (b - a)) * 100));
}

export function fmtRange(startISO: string, endISO: string): string {
  const s = new Date(toMs(startISO));
  const e = new Date(toMs(endISO));
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("it-IT", opt)} – ${e.toLocaleDateString("it-IT", opt)}`;
}
