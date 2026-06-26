// ============================================================================
// Data Intelligence — motore di metriche, correlazioni e insight per R&D.
// Aggrega i dati di Carico (GPS+HR), Performance (test→KPI), Area Medica e
// Antropometria in una matrice per-atleta su cui costruire correlazioni e
// reportistica. Tutto deterministico: stessa base dati → stessi risultati.
// ============================================================================

import { getAthletes, getGps, getMedical } from "./data";
import type { PlayerRole } from "./types";

const REF_DATE = "2026-06-22";

export type MetricGroup = "Carico" | "GPS" | "Performance" | "Medica" | "Antropometria";

export interface MetricDef {
  key: string;
  label: string;
  short: string;
  unit: string;
  group: MetricGroup;
  decimals: number;
  /** true = più alto è meglio, false = più basso è meglio, null = neutro. */
  good: boolean | null;
  help: string;
}

/** Metriche disponibili per le correlazioni (in ordine di gruppo). */
export const METRICS: MetricDef[] = [
  // Carico interno
  { key: "loadAvg", label: "Carico medio (sRPE)", short: "sRPE medio", unit: "AU", group: "Carico", decimals: 0, good: null, help: "Carico interno medio per seduta (durata × RPE)." },
  { key: "loadTot", label: "Carico totale (sRPE)", short: "sRPE tot", unit: "AU", group: "Carico", decimals: 0, good: null, help: "Somma del carico interno nella finestra." },
  { key: "monotony", label: "Monotonia del carico", short: "Monotonia", unit: "", group: "Carico", decimals: 2, good: false, help: "Media/DS del carico giornaliero (Foster). >2.0 = rischio." },
  { key: "strain", label: "Strain settimanale", short: "Strain", unit: "AU", group: "Carico", decimals: 0, good: false, help: "Carico totale × monotonia (Foster 1998)." },
  { key: "loadSpike", label: "Picco di carico (z)", short: "Picco carico", unit: "σ", group: "Carico", decimals: 1, good: false, help: "Quanto l'ultima seduta supera la media personale (deviazioni standard)." },
  { key: "trimpAvg", label: "TRIMP medio", short: "TRIMP", unit: "AU", group: "Carico", decimals: 0, good: null, help: "Training Impulse medio dalle zone HR (Edwards)." },
  // GPS / esterno
  { key: "distanceTot", label: "Distanza totale", short: "Distanza", unit: "km", group: "GPS", decimals: 1, good: null, help: "Distanza percorsa totale (GPS)." },
  { key: "hsrTot", label: "Alta velocità (HSR)", short: "HSR", unit: "m", group: "GPS", decimals: 0, good: null, help: "Distanza > 19.8 km/h cumulata." },
  { key: "sprintTot", label: "Sprint totali", short: "Sprint", unit: "n", group: "GPS", decimals: 0, good: null, help: "Numero di sprint nella finestra." },
  { key: "playerLoad", label: "Player Load medio", short: "Player Load", unit: "AU", group: "GPS", decimals: 0, good: null, help: "Carico accelerometrico medio per seduta." },
  { key: "maxSpeed", label: "Velocità massima", short: "Vel. max", unit: "km/h", group: "GPS", decimals: 1, good: true, help: "Picco di velocità registrato." },
  { key: "accelTot", label: "Accelerazioni", short: "Accel.", unit: "n", group: "GPS", decimals: 0, good: null, help: "Accelerazioni > 3 m/s² cumulate." },
  // Performance
  { key: "pIndex", label: "P-Index", short: "P-Index", unit: "°", group: "Performance", decimals: 0, good: true, help: "Indice composito di performance (percentile)." },
  { key: "forza", label: "Forza", short: "Forza", unit: "°", group: "Performance", decimals: 0, good: true, help: "Percentile forza (1RM, IMTP)." },
  { key: "potenza", label: "Potenza", short: "Potenza", unit: "°", group: "Performance", decimals: 0, good: true, help: "Percentile potenza (CMJ, F–V)." },
  { key: "reattivita", label: "Reattività", short: "Reattività", unit: "°", group: "Performance", decimals: 0, good: true, help: "Percentile reattività (RSI, drop jump)." },
  { key: "asymmetry", label: "Asimmetria arti", short: "Asimmetria", unit: "%", group: "Performance", decimals: 0, good: false, help: "Differenza % tra arti (LSI). >15% = rischio." },
  // Antropometria
  { key: "age", label: "Età", short: "Età", unit: "anni", group: "Antropometria", decimals: 0, good: null, help: "Età anagrafica." },
  { key: "bodyFat", label: "Massa grassa", short: "Massa grassa", unit: "%", group: "Antropometria", decimals: 1, good: false, help: "Percentuale di massa grassa." },
  { key: "weight", label: "Peso", short: "Peso", unit: "kg", group: "Antropometria", decimals: 0, good: null, help: "Peso corporeo." },
  // Medica
  { key: "injuryDays", label: "Giorni indisponibilità", short: "Gg out", unit: "gg", group: "Medica", decimals: 0, good: false, help: "Giorni dall'inizio dell'episodio medico aperto (0 = disponibile)." },
];

export interface AthletePoint {
  id: string;
  name: string;
  role: PlayerRole;
  shirt: number;
  injured: boolean;
  v: Record<string, number>;
}

function mean(a: number[]) {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}
function sd(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
}
function ageOf(iso: string) {
  return Math.floor((Date.parse(REF_DATE) - Date.parse(iso)) / (365.25 * 86400000));
}
function daysSince(iso: string) {
  return Math.max(0, Math.round((Date.parse(REF_DATE) - Date.parse(iso)) / 86400000));
}

/** Coefficiente di correlazione di Pearson tra due serie appaiate. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/** Etichetta qualitativa della forza di correlazione (|r|). */
export function strengthLabel(r: number): { label: string; tone: "good" | "warn" | "muted" } {
  const a = Math.abs(r);
  if (a >= 0.7) return { label: "forte", tone: "good" };
  if (a >= 0.4) return { label: "moderata", tone: "warn" };
  if (a >= 0.2) return { label: "debole", tone: "muted" };
  return { label: "trascurabile", tone: "muted" };
}

/** Matrice per-atleta: una riga per atleta con tutte le metriche. */
export function buildMatrix(clientId: string): AthletePoint[] {
  const athletes = getAthletes(clientId);
  const gps = getGps(clientId);
  const medical = getMedical(clientId);

  return athletes
    .map((a) => ({ a, recs: gps.filter((g) => g.athleteId === a.id).sort((m, n) => m.date.localeCompare(n.date)) }))
    .filter(({ recs }) => recs.length > 0)
    .map(({ a, recs }) => {
      const loads = recs.map((g) => g.sRPE);
      const loadAvg = mean(loads);
      const loadTot = loads.reduce((s, x) => s + x, 0);
      const dailySd = sd(loads);
      const monotony = dailySd > 0 ? loadAvg / dailySd : 0;
      // Picco di carico: z-score dell'ultima seduta rispetto alla media personale.
      const lastLoad = loads[loads.length - 1] ?? loadAvg;
      const loadSpike = dailySd > 0 ? (lastLoad - loadAvg) / dailySd : 0;
      const med = medical.find((m) => m.athleteId === a.id && m.phase !== "conclusa");

      const v: Record<string, number> = {
        loadAvg: Math.round(loadAvg),
        loadTot: Math.round(loadTot),
        monotony: round2(monotony),
        strain: Math.round(loadTot * monotony),
        loadSpike: round1(loadSpike),
        trimpAvg: Math.round(mean(recs.map((g) => g.trimp))),
        distanceTot: round1(recs.reduce((s, g) => s + g.totalDistanceM, 0) / 1000),
        hsrTot: Math.round(recs.reduce((s, g) => s + g.highSpeedM, 0)),
        sprintTot: recs.reduce((s, g) => s + g.sprintCount, 0),
        playerLoad: Math.round(mean(recs.map((g) => g.playerLoad))),
        maxSpeed: round1(Math.max(0, ...recs.map((g) => g.maxSpeedKmh))),
        accelTot: recs.reduce((s, g) => s + g.accelerations, 0),
        pIndex: a.profile.pIndex,
        forza: a.profile.forza,
        potenza: a.profile.potenza,
        reattivita: a.profile.reattivita,
        asymmetry: Math.max(0, 100 - a.profile.simmetria),
        age: ageOf(a.birthDate),
        bodyFat: a.bodyFatPct,
        weight: a.weightKg,
        injuryDays: med ? daysSince(med.date) : 0,
      };

      return {
        id: a.id,
        name: a.lastName,
        role: a.role,
        shirt: a.shirtNumber,
        injured: !!med,
        v,
      };
    });
}

export type InsightSeverity = "alta" | "media" | "info";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  science: string;
  athletes: string[];
}

/** Insight automatici (segnali) generati dalla matrice. */
export function buildInsights(matrix: AthletePoint[]): Insight[] {
  const out: Insight[] = [];
  if (matrix.length === 0) return out;

  const hiMono = matrix.filter((p) => p.v.monotony >= 2.0);
  if (hiMono.length) {
    out.push({
      id: "monotony",
      severity: "alta",
      title: "Monotonia del carico elevata",
      detail: `${hiMono.length} atleti sopra 2.0: carico poco variato, recuperi insufficienti.`,
      science: "Foster (1998): monotonia alta + carico elevato → picco di infortuni e malattie.",
      athletes: hiMono.map((p) => p.name),
    });
  }

  const spike = matrix.filter((p) => p.v.loadSpike >= 1.5);
  if (spike.length) {
    out.push({
      id: "spike",
      severity: "alta",
      title: "Picco di carico nell'ultima seduta",
      detail: `${spike.length} atleti con carico ≥ 1.5σ sopra la propria media: aumento brusco da gestire.`,
      science: "Variazioni rapide del carico rispetto al proprio baseline aumentano il rischio.",
      athletes: spike.map((p) => p.name),
    });
  }

  const asym = matrix.filter((p) => p.v.asymmetry >= 15);
  if (asym.length) {
    out.push({
      id: "asymmetry",
      severity: "media",
      title: "Asimmetrie inter-arto",
      detail: `${asym.length} atleti con asimmetria ≥ 15% nei test di salto.`,
      science: "Bishop (2021): asimmetrie > 15% riducono performance e alzano il rischio.",
      athletes: asym.map((p) => p.name),
    });
  }

  const rtpLoad = matrix.filter((p) => p.injured && p.v.loadAvg > 0);
  if (rtpLoad.length) {
    out.push({
      id: "rtp",
      severity: "media",
      title: "Carico durante recupero",
      detail: `${rtpLoad.length} atleti con episodio medico aperto stanno accumulando carico: monitorare il return-to-play.`,
      science: "Progressione graduale del carico in riatletizzazione (criteri RTP).",
      athletes: rtpLoad.map((p) => p.name),
    });
  }

  const strains = matrix.map((p) => p.v.strain);
  const thr = mean(strains) + sd(strains);
  const hiStrain = matrix.filter((p) => p.v.strain > thr && thr > 0);
  if (hiStrain.length) {
    out.push({
      id: "strain",
      severity: "info",
      title: "Strain settimanale anomalo",
      detail: `${hiStrain.length} atleti oltre la soglia statistica di strain (media + 1 DS) del gruppo.`,
      science: "Strain = carico totale × monotonia: utile per individuare outlier.",
      athletes: hiStrain.map((p) => p.name),
    });
  }

  return out;
}

function round1(n: number) { return Math.round(n * 10) / 10; }
function round2(n: number) { return Math.round(n * 100) / 100; }
