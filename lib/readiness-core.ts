// ============================================================================
// Readiness — parti PURE (modello, calcolo, soglie). Importabile lato client
// senza trascinare il data layer. Lo storico/seed sta in lib/readiness.ts.
// ============================================================================

import { SCORE_AMBER, SCORE_RED, FLAG_META } from "./readinessEngine-core";

/** Scala del check-in: ogni parametro va da 1 a 6. */
export const SCALE_MIN = 1;
export const SCALE_MAX = 6;

export interface WellnessItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  /** Etichette agli estremi (valore 1 → valore 6). */
  low: string;
  high: string;
  /** true = valore ALTO è negativo (stress, DOMS): invertito nel calcolo. */
  invert?: boolean;
}

/** I 4 parametri del Check-in giornaliero (scala 1–6). */
export const WELLNESS: WellnessItem[] = [
  { key: "sonno", label: "Qualità del Sonno", icon: "moon", color: "#7c3aed", low: "Pessimo", high: "Eccellente" },
  { key: "recupero", label: "Recupero Fisico", icon: "battery", color: "#16a34a", low: "A pezzi", high: "Fresco" },
  { key: "stress", label: "Stress Mentale", icon: "bolt", color: "#d97706", low: "Basso (bene)", high: "Alto (male)", invert: true },
  { key: "doms", label: "Indolenzimento Muscolare (DOMS)", icon: "pulse", color: "#dc2626", low: "Nessuno", high: "Molto alto", invert: true },
];

/** Dolori/fastidi selezionabili nella sezione "Salute Specifica". */
export const PAIN_OPTIONS = [
  "Mal di schiena",
  "Mal di ginocchio",
  "Dolore alla spalla",
  "Dolore cervicale",
  "Altro dolore articolare",
  "Affaticamento anomalo",
  "Sintomi influenzali",
];

export interface ReadinessEntry {
  id: string;
  clientId: string;
  athleteId: string;
  date: string; // ISO giorno
  items: Record<string, number>; // 1–6 per parametro
  score: number; // Readiness %
  /** Dolori/fastidi segnalati (sezione opzionale). */
  pains?: string[];
}

/** "Bontà" 1–6 di un parametro (inverte stress/DOMS dove alto = male). */
export function goodness(item: WellnessItem, value: number): number {
  return item.invert ? SCALE_MAX + SCALE_MIN - value : value;
}

/** Readiness % da una risposta al check-in (scala 1–6, con inversioni). */
export function computeReadiness(items: Record<string, number>): number {
  const n = WELLNESS.length;
  const sum = WELLNESS.reduce((s, it) => s + goodness(it, items[it.key] ?? 3), 0);
  return Math.round(((sum - n * SCALE_MIN) / (n * (SCALE_MAX - SCALE_MIN))) * 100);
}

export type ReadinessLevel = "Nella norma" | "Sotto la norma" | "Molto sotto";

// Un'unica semantica in tutta l'app: soglie e colori sono quelli del motore EBM
// (score 0–100 dove 50 = baseline individuale). Così Panoramica, Rosa, scheda
// atleta e sezione Readiness mostrano SEMPRE lo stesso stato per lo stesso numero.
export function readinessTier(score: number): { level: ReadinessLevel; color: string; bg: string } {
  if (score >= SCORE_AMBER) return { level: "Nella norma", color: FLAG_META.green.color, bg: FLAG_META.green.bg };
  if (score >= SCORE_RED) return { level: "Sotto la norma", color: FLAG_META.amber.color, bg: FLAG_META.amber.bg };
  return { level: "Molto sotto", color: FLAG_META.red.color, bg: FLAG_META.red.bg };
}
