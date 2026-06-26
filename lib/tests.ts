import type { PhysicalKpi } from "./types";

// ============================================================================
// Batteria test TESTÀRE (dal Season Report). Ogni test alimenta una dimensione
// del profilo performance ed è ancorato a letteratura peer-reviewed (CEBM).
// ============================================================================

// ----------------------------------------------------------------------------
// BATTERIA TEST REALE TESTÀRE per il calcio (fornita dall'utente): 18 test,
// con unità, dimensione e flag bilaterale (DX/SX). È il protocollo ufficiale.
// ----------------------------------------------------------------------------
export type BatteryDim = "Forza" | "Potenza" | "Reattività" | "Stabilità" | "Mobilità";

export interface TestDef {
  num: number;
  name: string;
  unit: string; // "" se adimensionale
  dim: BatteryDim;
  bilateral: boolean; // misurato DX/SX
}

export const BATTERY: TestDef[] = [
  { num: 1, name: "1 RM", unit: "kg", dim: "Forza", bilateral: false },
  { num: 2, name: "1 RM / peso", unit: "xKg", dim: "Forza", bilateral: false },
  { num: 3, name: "NORDIC", unit: "N", dim: "Forza", bilateral: true },
  { num: 4, name: "IMTP", unit: "N", dim: "Forza", bilateral: false },
  { num: 5, name: "Squeeze sfigmomanometro", unit: "mmHg", dim: "Forza", bilateral: false },
  { num: 6, name: "CMJ altezza", unit: "cm", dim: "Forza", bilateral: false },
  { num: 7, name: "Single leg CMJ", unit: "cm", dim: "Potenza", bilateral: true },
  { num: 8, name: "Single leg hop", unit: "cm", dim: "Potenza", bilateral: true },
  { num: 9, name: "Single leg hop somma", unit: "cm", dim: "Potenza", bilateral: false },
  { num: 10, name: "Drop jump altezza", unit: "cm", dim: "Potenza", bilateral: false },
  { num: 11, name: "Single leg drop jump", unit: "cm", dim: "Potenza", bilateral: true },
  { num: 12, name: "RSI drop jump", unit: "", dim: "Reattività", bilateral: false },
  { num: 13, name: "RSI single leg drop jump", unit: "", dim: "Reattività", bilateral: true },
  { num: 14, name: "Knee to Wall", unit: "cm", dim: "Mobilità", bilateral: true },
  { num: 15, name: "Deep Squat", unit: "/3", dim: "Mobilità", bilateral: false },
];

/** Colori delle dimensioni della batteria (pill colorate). */
export const BATTERY_DIM: Record<BatteryDim, { color: string; bg: string }> = {
  "Forza": { color: "#dc2626", bg: "#fee2e2" },
  "Potenza": { color: "#d97706", bg: "#fef3c7" },
  "Reattività": { color: "#4f46e5", bg: "#e0e7ff" },
  "Stabilità": { color: "#c026d3", bg: "#fae8ff" },
  "Mobilità": { color: "#16a34a", bg: "#dcfce7" },
};

/** Metadati dimensioni del PROFILO KPI (radar) — distinto dalla batteria. */
export const DIM_META: Record<keyof PhysicalKpi | "Mobilità", { label: string; color: string }> = {
  forza: { label: "Forza", color: "#7c3aed" },
  potenza: { label: "Potenza", color: "#e94f35" },
  reattivita: { label: "Reattività", color: "#0891b2" },
  simmetria: { label: "Simmetrie", color: "#16a34a" },
  Mobilità: { label: "Mobilità", color: "#64748b" },
};
