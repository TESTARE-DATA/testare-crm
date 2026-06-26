// ============================================================================
// Misurazioni interne — seed deterministico condiviso tra la pagina Misurazioni
// e la scheda atleta (così "tutto si parla"). Le aggiunte utente vivono in
// localStorage `misurazioni:<clientId>`.
// ============================================================================

import type { Measurement } from "./types";
import { getAthletes } from "./data";

const SAMPLES: { type: string; unit: string; category: string; base: number; spread: number; daysAgo: number }[] = [
  { type: "Peso", unit: "kg", category: "Antropometria", base: 76, spread: 8, daysAgo: 3 },
  { type: "Sprint 10m", unit: "s", category: "Velocità", base: 1.72, spread: 0.12, daysAgo: 6 },
  { type: "CMJ", unit: "cm", category: "Potenza", base: 41, spread: 7, daysAgo: 6 },
  { type: "Sit & Reach", unit: "cm", category: "Mobilità", base: 12, spread: 6, daysAgo: 10 },
];
const addDays = (days: number) => { const d = new Date("2026-06-19T00:00:00Z"); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); };

/** Misurazioni seed deterministiche per il cliente. */
export function getMeasurements(clientId: string, recordedBy?: string): Measurement[] {
  const athletes = getAthletes(clientId).slice(0, 6);
  const out: Measurement[] = [];
  athletes.forEach((a, ai) => {
    SAMPLES.forEach((s, si) => {
      if ((ai + si) % 2 === 0) return; // distribuzione sparsa
      const v = s.base + ((ai * 7 + si * 3) % 11) / 10 * s.spread - s.spread / 2;
      out.push({
        id: `${clientId}-meas-seed-${a.shirtNumber}-${si}`,
        clientId, athleteId: a.id, date: addDays(s.daysAgo + (ai % 3)),
        category: s.category, type: s.type,
        value: Math.round(v * 100) / 100, unit: s.unit,
        recordedBy,
      });
    });
  });
  return out;
}

export const getAthleteMeasurements = (clientId: string, athleteId: string, recordedBy?: string) =>
  getMeasurements(clientId, recordedBy).filter((m) => m.athleteId === athleteId);
