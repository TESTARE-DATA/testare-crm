// ============================================================================
// Squad insights — derivazioni di COMPOSIZIONE della rosa per la Panoramica.
// Parti PURE (nessun data layer): si calcolano dalla rosa risolta lato client,
// così riflettono in tempo reale aggiunte/modifiche/rimozioni ("tutto si parla").
// ============================================================================

import type { Athlete, PhysicalKpi } from "./types";

/** Data di riferimento per età/stagione, coerente col dataset mock. */
export const REF_DATE = "2026-06-22";

/** Età (anni interi) a una certa data di riferimento. */
export function ageAt(birthISO: string, refISO: string = REF_DATE): number {
  return Math.floor((Date.parse(refISO) - Date.parse(birthISO)) / (365.25 * 86400000));
}

/** Inizio della stagione calcistica in corso alla data (1° luglio). */
export function seasonStartISO(refISO: string = REF_DATE): string {
  const d = new Date(refISO);
  const y = d.getUTCFullYear();
  // Da luglio in poi la stagione è iniziata quest'anno, altrimenti l'anno prima.
  const startYear = d.getUTCMonth() >= 6 ? y : y - 1;
  return `${startYear}-07-01`;
}

// ---- Nazionalità: italiani / comunitari (UE) / extra-UE ---------------------
// Stati membri dell'Unione Europea (nomi come compaiono in rosa, senza emoji).
const EU_COUNTRIES = new Set([
  "Austria", "Belgio", "Bulgaria", "Cipro", "Croazia", "Danimarca", "Estonia",
  "Finlandia", "Francia", "Germania", "Grecia", "Irlanda", "Lettonia", "Lituania",
  "Lussemburgo", "Malta", "Paesi Bassi", "Olanda", "Polonia", "Portogallo",
  "Rep. Ceca", "Repubblica Ceca", "Romania", "Slovacchia", "Slovenia", "Spagna",
  "Svezia", "Ungheria",
]);

/** Nome del paese senza la bandiera emoji iniziale. */
export function countryName(nationality: string): string {
  return nationality.replace(/^[^\p{L}]+/u, "").trim();
}

export type NationGroup = "ita" | "eu" | "extra";

/** Classifica la nazionalità: italiano, comunitario (UE) o extra-UE. */
export function nationGroup(nationality: string): NationGroup {
  const name = countryName(nationality);
  if (name === "Italia") return "ita";
  return EU_COUNTRIES.has(name) ? "eu" : "extra";
}

// ---- Alert performance (≥2 flag) -------------------------------------------
export interface KpiFlag { label: string; detail: string }

/** Flag attivi sul profilo fisico (criteri = quelli usati per il conteggio alert). */
export function kpiFlags(k: PhysicalKpi): KpiFlag[] {
  const flags: KpiFlag[] = [];
  if (k.forza < 50) flags.push({ label: "Forza sotto soglia", detail: `Forza ${k.forza}° percentile (< 50)` });
  if (k.potenza < 50) flags.push({ label: "Potenza sotto soglia", detail: `Potenza ${k.potenza}° percentile (< 50)` });
  if (k.reattivita < 50) flags.push({ label: "Reattività sotto soglia", detail: `Reattività ${k.reattivita}° percentile (< 50)` });
  if (k.simmetria < 70) flags.push({ label: "Asimmetria", detail: `Simmetria ${k.simmetria}° percentile (< 70)` });
  const spread = Math.max(k.forza, k.potenza, k.reattivita) - Math.min(k.forza, k.potenza, k.reattivita);
  if (spread > 35) flags.push({ label: "Profilo sbilanciato", detail: `Divario tra qualità di ${spread} punti (> 35)` });
  return flags;
}

export const flagCount = (k: PhysicalKpi): number => kpiFlags(k).length;

// ---- Composizione rosa ------------------------------------------------------
export interface SquadComposition {
  count: number;
  avgAge: number;
  youngest?: { athlete: Athlete; age: number };
  oldest?: { athlete: Athlete; age: number };
  firstYear: Athlete[];
  youth: Athlete[];
  nations: { ita: number; eu: number; extra: number };
}

/** Aggrega le KPI di composizione richieste in panoramica. */
export function squadComposition(athletes: Athlete[], refISO: string = REF_DATE): SquadComposition {
  const n = athletes.length;
  const withAge = athletes.map((a) => ({ athlete: a, age: ageAt(a.birthDate, refISO) }));
  const avgAge = n ? Math.round((withAge.reduce((s, x) => s + x.age, 0) / n) * 10) / 10 : 0;
  const sorted = [...withAge].sort((a, b) => a.age - b.age);
  const season = seasonStartISO(refISO);

  const nations = { ita: 0, eu: 0, extra: 0 };
  for (const a of athletes) nations[nationGroup(a.nationality)]++;

  return {
    count: n,
    avgAge,
    youngest: sorted[0],
    oldest: sorted[sorted.length - 1],
    firstYear: athletes.filter((a) => a.joinedAt >= season),
    youth: athletes.filter((a) => a.fromYouth),
    nations,
  };
}
