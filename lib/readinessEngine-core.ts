import type { Athlete } from "./types";

// ============================================================================
// Daily Readiness Engine — parti PURE (CONFIG, questionario, tipi, soglie).
// Importabile lato client senza trascinare il data layer. La generazione dei
// dati e il calcolo stanno in lib/readinessEngine.ts (server). Spec v1.0 EBM.
// ============================================================================

// ---- CONFIG (§8, pannello admin) -------------------------------------------
export type ReItem = "fatigue" | "sleep_quality" | "sleep_hours" | "doms" | "stress" | "mood";

export const RE_CONFIG = {
  baseline_window_days: 28,
  min_baseline_days: 7,
  min_sd_floor: 0.5,
  typical_error: 0.5,
  weights: { fatigue: 0.3, doms: 0.25, sleep_quality: 0.15, sleep_hours: 0.1, stress: 0.1, mood: 0.1 } as Record<ReItem, number>,
  z_red: -1.5,
  z_amber: -0.75,
  z_item_red: -1.5,
  swc_multiplier: 0.2,
  display_scale: 20,
  doms_red: 2,
  doms_area_trigger: 4,
  abs_sleep_red: 5.0,
  ewma_acute_N: 7,
  ewma_chronic_N: 28,
  load_spike_pct: 50,
  flatline_days: 5,
  compliance_alert_days: 3,
  morning_window_start: "06:00",
  morning_window_end: "11:00",
  rpe_delay_min: 30,
};

// ---- Item del questionario (1 = pessimo … 7 = ottimo, alto = meglio) --------
export interface QItem {
  key: ReItem;
  label: string;
  short: string;
  icon: string;
  color: string;
  kind: "scale" | "hours";
  required: boolean;
  anchors?: string[]; // ancoraggi verbali su ogni punto 1..7 (UI atleta)
}

export const RE_QUESTIONNAIRE: QItem[] = [
  { key: "fatigue", label: "Affaticamento", short: "Fatica", icon: "battery", color: "#dc2626", kind: "scale", required: true, anchors: ["Esausto", "Molto stanco", "Stanco", "Nella media", "Abbastanza fresco", "Fresco", "Pieno di energia"] },
  { key: "doms", label: "Indolenzimento muscolare (DOMS)", short: "DOMS", icon: "pulse", color: "#ea580c", kind: "scale", required: true, anchors: ["Fortissimo", "Molto forte", "Marcato", "Moderato", "Lieve", "Molto lieve", "Nessuno"] },
  { key: "sleep_quality", label: "Qualità del sonno", short: "Sonno", icon: "moon", color: "#7c3aed", kind: "scale", required: true, anchors: ["Pessima", "Scarsa", "Mediocre", "Discreta", "Buona", "Molto buona", "Ottima"] },
  { key: "sleep_hours", label: "Ore di sonno", short: "Ore", icon: "moon", color: "#6366f1", kind: "hours", required: true },
  { key: "stress", label: "Stress mentale", short: "Stress", icon: "bolt", color: "#d97706", kind: "scale", required: true, anchors: ["Fortissimo", "Molto alto", "Alto", "Moderato", "Basso", "Molto basso", "Nessuno"] },
  { key: "mood", label: "Umore", short: "Umore", icon: "sparkle", color: "#16a34a", kind: "scale", required: false, anchors: ["Pessimo", "Giù", "Fiacco", "Neutro", "Discreto", "Buono", "Ottimo"] },
];

export const DOMS_AREAS = ["Flessori DX", "Flessori SX", "Quadricipite DX", "Quadricipite SX", "Polpaccio DX", "Polpaccio SX", "Adduttori", "Schiena", "Caviglia DX", "Caviglia SX"];

// ---- Tipi dato (§3) ---------------------------------------------------------
export interface WellnessEntry {
  athleteId: string;
  date: string;
  out_of_window: boolean;
  fatigue: number;
  sleep_quality: number;
  sleep_hours: number;
  doms: number;
  doms_area: string[];
  stress: number;
  mood: number | null;
  data_quality_flag: "flatline" | null;
}

export interface LoadSession {
  id: string;
  athleteId: string;
  date: string;
  rpe: number;
  duration_min: number;
  session_load: number;
  session_type: "allenamento" | "partita" | "palestra" | "rigenerante";
}

export type Flag = "green" | "amber" | "red";
export type Severity = "clinical" | "red" | "amber" | "quality" | "green";

export interface LoadDaily {
  daily: number;
  weekly: number;
  prevWeekly: number;
  wowPct: number;
  ewmaAcute: number;
  ewmaChronic: number;
  spike: boolean;
}

export interface DayPoint {
  date: string;
  readinessZ: number | null;
  score: number | null;
  flag: Flag;
  dailyLoad: number;
}

export interface ReadinessState {
  athlete: Athlete;
  date: string;
  baselineStatus: "ready" | "provisional";
  baselineValidDays: number;
  entry: WellnessEntry | null;
  z: Partial<Record<ReItem, number>> | null;
  readinessZ: number | null;
  readinessScore: number | null; // 0–100 (solo display)
  flag: Flag;
  clinicalFlag: string[] | null;
  itemAlert: boolean;
  dataQuality: "flatline" | null;
  compliance: { missing7: number; alert: boolean };
  load: LoadDaily;
  alert: { severity: Severity; category: string; message: string };
  history: DayPoint[]; // ultimi 14 giorni
}

export const SEVERITY_RANK: Record<Severity, number> = { clinical: 4, red: 3, amber: 2, quality: 1, green: 0 };

export const FLAG_META: Record<Flag, { label: string; color: string; bg: string }> = {
  green: { label: "Verde", color: "var(--good)", bg: "rgba(22,163,74,.12)" },
  amber: { label: "Ambra", color: "var(--warn)", bg: "rgba(217,119,6,.12)" },
  red: { label: "Rosso", color: "var(--bad)", bg: "rgba(220,38,38,.12)" },
};
