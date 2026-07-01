// ============================================================================
// Readiness — prontezza dell'atleta dal questionario di benessere (wellness).
// Sostituisce il P-Index come metrica di stato: il P-Index deriva dai test
// (foto statica nel tempo), la Readiness è quotidiana e varia giorno per giorno.
//
// Modello: questionario tipo Hooper-McLean (5 item, scala 1–5 dove 5 = meglio).
// Readiness % = (somma - 5) / 20 * 100  →  0–100%.
// Lo storico seed è deterministico; le compilazioni dell'utente (localStorage,
// chiave `readiness:<clientId>`) si fondono sopra il seed nella UI client.
// ============================================================================

import { getAthletes } from "./data";
import { getReadinessEngine, getReadinessTeam, getAthleteReadinessState } from "./readinessEngine";
import { WELLNESS, computeReadiness, SCALE_MIN, SCALE_MAX, type ReadinessEntry } from "./readiness-core";

export { WELLNESS, computeReadiness, readinessTier, goodness, PAIN_OPTIONS, SCALE_MIN, SCALE_MAX } from "./readiness-core";
export type { ReadinessEntry, ReadinessLevel, WellnessItem } from "./readiness-core";

// ---- Seed deterministico ----------------------------------------------------
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const REF = Date.parse("2026-06-22");
const day = (d: number) => new Date(REF + d * 86400000).toISOString().slice(0, 10);
const HISTORY_DAYS = 14;

/** Genera lo storico readiness (ultimi 14 giorni) per ogni atleta del cliente. */
function seedFor(clientId: string): ReadinessEntry[] {
  const out: ReadinessEntry[] = [];
  for (const a of getAthletes(clientId)) {
    const r = rng(a.shirtNumber * 7 + clientId.length * 53 + a.lastName.length);
    // livello base: più basso per chi non è disponibile
    const base = a.status === "infortunato" ? 0.42 : a.status === "in recupero" ? 0.58 : a.status === "a riposo" ? 0.66 : 0.78;
    for (let d = -HISTORY_DAYS + 1; d <= 0; d++) {
      const items: Record<string, number> = {};
      for (const it of WELLNESS) {
        const noise = (r() - 0.5) * 1.8;
        // "bontà" 1–6 ~ livello base; per stress/DOMS si inverte (alto = male).
        const g = Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(base * 5 + 1 + noise)));
        items[it.key] = it.invert ? SCALE_MAX + SCALE_MIN - g : g;
      }
      out.push({
        id: `${a.id}-rd-${d + HISTORY_DAYS}`,
        clientId,
        athleteId: a.id,
        date: day(d),
        items,
        score: computeReadiness(items),
      });
    }
  }
  return out;
}

const CACHE = new Map<string, ReadinessEntry[]>();
function all(clientId: string): ReadinessEntry[] {
  if (!CACHE.has(clientId)) CACHE.set(clientId, seedFor(clientId));
  return CACHE.get(clientId)!;
}

/** Tutte le voci readiness seed del cliente (ordinate per data). */
export function getReadiness(clientId: string): ReadinessEntry[] {
  return all(clientId);
}

// ============================================================================
// FONTE UNICA DI VERITÀ: i getter pubblici delegano al MOTORE EBM
// (lib/readinessEngine). Così ogni sezione (Panoramica, Rosa, scheda atleta,
// Area Medica, Programmazione, sezione Readiness, Vista Atleta) mostra lo STESSO
// identico numero. Il seed legacy sopra resta solo per retrocompatibilità dei
// tipi/UI che leggono ReadinessEntry; i valori vengono dal motore.
// ============================================================================

/** Storico readiness di un atleta (giorni compilati), dal più vecchio al più recente. */
export function getAthleteReadiness(clientId: string, athleteId: string): ReadinessEntry[] {
  const st = getAthleteReadinessState(clientId, athleteId);
  if (!st) return [];
  return st.history
    .filter((h) => h.score != null)
    .map((h) => ({ id: `${athleteId}-rd-${h.date}`, clientId, athleteId, date: h.date, items: {}, score: h.score as number }));
}

/** Readiness attuale per ogni atleta: { athleteId → score EBM } (fallback all'ultimo dato noto). */
export function getReadinessMap(clientId: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of getReadinessEngine(clientId)) {
    const v = s.readinessScore ?? s.lastScore;
    if (v != null) map[s.athlete.id] = v;
  }
  return map;
}

/** Trend readiness media squadra per giorno (dal motore). */
export function getTeamReadinessTrend(clientId: string): { date: string; avg: number }[] {
  return getReadinessTeam(clientId).days
    .filter((d): d is { date: string; avg: number; n: number } => d.avg != null)
    .map((d) => ({ date: d.date, avg: d.avg }));
}

/** Readiness media squadra oggi (dal motore). */
export function getTeamReadiness(clientId: string): number {
  const t = getReadinessTeam(clientId);
  return t.todayAvg ?? t.avg14 ?? 0;
}
