// ============================================================================
// Motore della "vista giornaliera dell'allenamento" per la Data Analysis.
// Le tre aree (Carico, Cardiofrequenzimetro, GPS) condividono la stessa logica e
// la stessa sorgente dati (GpsRecord): cambiano solo le metriche mostrate.
//
// Schema (definito con l'utente):
//   selettore giornata → KPI squadra → tabella atleti ordinabile →
//   click atleta → scheda seduta con confronto BASELINE (sua media mobile 7/28gg)
//   e PIANIFICATO vs FATTO → flag automatici, con drill-down squadra→reparto→singolo.
//
// ⚠ NON usare l'ACWR (rapporto acuto:cronico): vietato nel progetto. Le medie
// mobili 7g/28g sono bande di RIFERIMENTO personali (confronto % oggi-vs-sua-media),
// mai un rapporto.
// Modulo PURO e client-safe (solo type-import). Nessuna dipendenza server.
// ============================================================================

import type { GpsRecord, PlayerRole } from "./types";

export type AreaKey = "carico" | "cardio" | "gps";

export interface MetricDef {
  key: string;
  label: string; // etichetta estesa (scheda atleta)
  short: string; // intestazione tabella
  unit: string;
  decimals: number;
  /** true = più alto significa più carico/sforzo (sopra il baseline = da monitorare).
   *  false = informativo/neutro (es. FC max, velocità max). */
  load: boolean;
  get: (g: GpsRecord) => number;
  /** Formattazione del valore (default: toFixed(decimals) + unità). */
  fmt?: (v: number) => string;
}

export type Agg = "sum" | "mean" | "max";

export interface TeamCard {
  key: string; // metric key, oppure "count"
  label: string;
  agg: Agg;
  icon: string;
  tone?: "default" | "brand" | "warn" | "good";
}

export interface AreaConfig {
  key: AreaKey;
  title: string;
  icon: string;
  /** Metrica usata per ordinamento di default, baseline e trend headline. */
  primary: string;
  metrics: MetricDef[];
  teamCards: TeamCard[];
  /** Mostra il confronto col pianificato (solo carico interno: sRPE da assignments). */
  planned: boolean;
  /** Nota metodologica in fondo alla vista. */
  note: string;
}

// ---- Formattatori ----------------------------------------------------------
const km = (m: number) => `${(m / 1000).toFixed(1)} km`;
const int = (v: number) => Math.round(v).toLocaleString("it-IT");
const dec1 = (v: number) => v.toFixed(1);

// ---- Cataloghi metriche per area -------------------------------------------
const M = {
  sRPE: { key: "sRPE", label: "Carico interno (sRPE)", short: "sRPE", unit: "AU", decimals: 0, load: true, get: (g: GpsRecord) => g.sRPE, fmt: int } as MetricDef,
  rpe: { key: "rpe", label: "RPE percepito", short: "RPE", unit: "", decimals: 0, load: true, get: (g: GpsRecord) => g.rpe } as MetricDef,
  dur: { key: "dur", label: "Durata seduta", short: "Durata", unit: "′", decimals: 0, load: false, get: (g: GpsRecord) => g.durationMin } as MetricDef,
  trimp: { key: "trimp", label: "TRIMP (Edwards)", short: "TRIMP", unit: "AU", decimals: 0, load: true, get: (g: GpsRecord) => g.trimp, fmt: int } as MetricDef,
  avgHr: { key: "avgHr", label: "FC media", short: "FC media", unit: "bpm", decimals: 0, load: false, get: (g: GpsRecord) => g.avgHr } as MetricDef,
  maxHr: { key: "maxHr", label: "FC max rilevata", short: "FC max", unit: "bpm", decimals: 0, load: false, get: (g: GpsRecord) => g.maxHr } as MetricDef,
  z4: { key: "z4", label: "Tempo in Z4", short: "Z4", unit: "′", decimals: 0, load: true, get: (g: GpsRecord) => g.hrZone4Min } as MetricDef,
  z5: { key: "z5", label: "Tempo in Z5", short: "Z5", unit: "′", decimals: 0, load: true, get: (g: GpsRecord) => g.hrZone5Min } as MetricDef,
  dist: { key: "dist", label: "Distanza totale", short: "Distanza", unit: "m", decimals: 0, load: true, get: (g: GpsRecord) => g.totalDistanceM, fmt: km } as MetricDef,
  hsr: { key: "hsr", label: "Distanza ad alta velocità", short: "Alta vel.", unit: "m", decimals: 0, load: true, get: (g: GpsRecord) => g.highSpeedM, fmt: (v) => `${Math.round(v)} m` } as MetricDef,
  sprint: { key: "sprint", label: "Numero di sprint", short: "Sprint", unit: "", decimals: 0, load: true, get: (g: GpsRecord) => g.sprintCount } as MetricDef,
  vmax: { key: "vmax", label: "Velocità massima", short: "Vel. max", unit: "km/h", decimals: 1, load: false, get: (g: GpsRecord) => g.maxSpeedKmh, fmt: dec1 } as MetricDef,
  acc: { key: "acc", label: "Accelerazioni (>3 m/s²)", short: "Acc", unit: "", decimals: 0, load: true, get: (g: GpsRecord) => g.accelerations } as MetricDef,
  dec: { key: "dec", label: "Decelerazioni", short: "Dec", unit: "", decimals: 0, load: true, get: (g: GpsRecord) => g.decelerations } as MetricDef,
  pload: { key: "pload", label: "Player Load", short: "P.Load", unit: "", decimals: 0, load: true, get: (g: GpsRecord) => g.playerLoad } as MetricDef,
};

export const AREA_CONFIG: Record<AreaKey, AreaConfig> = {
  carico: {
    key: "carico",
    title: "Carico",
    icon: "load",
    primary: "sRPE",
    metrics: [M.sRPE, M.rpe, M.dur, M.trimp],
    teamCards: [
      { key: "sRPE", label: "Carico squadra", agg: "sum", icon: "load", tone: "brand" },
      { key: "rpe", label: "RPE medio", agg: "mean", icon: "trend" },
      { key: "dur", label: "Durata media", agg: "mean", icon: "stopwatch" },
      { key: "count", label: "Atleti in seduta", agg: "sum", icon: "users" },
    ],
    planned: true,
    note: "Carico interno = sRPE (durata × RPE percepito). Il valore di seduta è letto contro la media mobile personale (7g/28g) e contro la squadra: «alto per la squadra» ≠ «alto per lui».",
  },
  cardio: {
    key: "cardio",
    title: "Cardiofrequenzimetro",
    icon: "pulse",
    primary: "trimp",
    metrics: [M.trimp, M.avgHr, M.maxHr, M.z4, M.z5],
    teamCards: [
      { key: "trimp", label: "TRIMP squadra", agg: "sum", icon: "load", tone: "brand" },
      { key: "avgHr", label: "FC media", agg: "mean", icon: "pulse" },
      { key: "maxHr", label: "FC max", agg: "max", icon: "trend", tone: "warn" },
      { key: "count", label: "Atleti in seduta", agg: "sum", icon: "users" },
    ],
    planned: false,
    note: "TRIMP (Edwards) pesa i minuti per zona di frequenza cardiaca: è il carico cardiovascolare interno. Z4–Z5 = tempo in soglia e sopra-soglia. FC max è il picco rilevato nella seduta, non la FCmax teorica.",
  },
  gps: {
    key: "gps",
    title: "GPS",
    icon: "live",
    primary: "dist",
    metrics: [M.dist, M.hsr, M.sprint, M.vmax, M.acc, M.dec, M.pload],
    teamCards: [
      { key: "dist", label: "Distanza squadra", agg: "sum", icon: "live", tone: "brand" },
      { key: "hsr", label: "Alta velocità", agg: "sum", icon: "trend" },
      { key: "vmax", label: "Top speed", agg: "max", icon: "stopwatch", tone: "good" },
      { key: "count", label: "Atleti tracciati", agg: "sum", icon: "users" },
    ],
    planned: false,
    note: "Carico esterno da tracking GPS. Il dato di seduta è confrontato con la media mobile personale (7g/28g) e con la squadra. La velocità massima è il picco assoluto, riferimento del singolo atleta.",
  },
};

export function getMetric(area: AreaConfig, key: string): MetricDef | undefined {
  return area.metrics.find((m) => m.key === key);
}

export function formatMetric(m: MetricDef, v: number): string {
  if (m.fmt) return m.fmt(v);
  const n = m.decimals ? v.toFixed(m.decimals) : Math.round(v).toLocaleString("it-IT");
  return m.unit ? `${n}${m.unit === "′" ? "" : " "}${m.unit}` : n;
}

// ---- Sessioni (giornate) ---------------------------------------------------
export interface SessionDay {
  date: string;
  isMatch: boolean;
  count: number;
}

/** Giornata di gara = la MAGGIORANZA degli atleti ha giocato >90′ (la partita vera
 *  coinvolge tutta la rosa). Evita i falsi positivi delle sedute lunghe del singolo. */
export function isMatchDay(recs: GpsRecord[]): boolean {
  if (!recs.length) return false;
  return recs.filter((r) => r.durationMin > 90).length >= recs.length * 0.6;
}

export function sessionDays(records: GpsRecord[]): SessionDay[] {
  const byDate = new Map<string, GpsRecord[]>();
  for (const g of records) {
    const arr = byDate.get(g.date) ?? [];
    arr.push(g);
    byDate.set(g.date, arr);
  }
  return [...byDate.entries()]
    .map(([date, recs]) => ({ date, isMatch: isMatchDay(recs), count: recs.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Statistica ------------------------------------------------------------
export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
export const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
};

const DAY = 86400000;
const ms = (iso: string) => Date.parse(iso + "T00:00:00");

/** Media mobile personale di una metrica nei `window` giorni PRECEDENTI a `date`
 *  (esclude la seduta vista): è il "baseline" del singolo. */
export function baseline(
  records: GpsRecord[],
  athleteId: string,
  get: (g: GpsRecord) => number,
  date: string,
  windowDays: number,
): { mean: number; n: number } {
  const end = ms(date);
  const from = end - windowDays * DAY;
  const vals = records
    .filter((g) => g.athleteId === athleteId && ms(g.date) < end && ms(g.date) >= from)
    .map(get);
  return { mean: mean(vals), n: vals.length };
}

/** Serie storica (asc per data) di una metrica per un atleta. */
export function series(records: GpsRecord[], athleteId: string, get: (g: GpsRecord) => number): { date: string; v: number }[] {
  return records
    .filter((g) => g.athleteId === athleteId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g) => ({ date: g.date, v: get(g) }));
}

export const pctDelta = (today: number, base: number): number | null => (base > 0 ? Math.round(((today - base) / base) * 100) : null);

// ---- Flag automatici (sul metric primario) ---------------------------------
export type FlagTone = "warn" | "info" | "good";
export interface Flag {
  tone: FlagTone;
  text: string;
}

/** Flag per un atleta nella seduta selezionata, sul metric primario:
 *  - sopra/sotto il SUO baseline 7g (soglia ±25%);
 *  - sopra/sotto la squadra del giorno (top/bottom rispetto alla media). */
export function flagsFor(
  area: AreaConfig,
  today: number,
  base7: number,
  teamMean: number,
): Flag[] {
  const out: Flag[] = [];
  const m = getMetric(area, area.primary)!;
  const dPers = pctDelta(today, base7);
  if (dPers != null && Math.abs(dPers) >= 25) {
    if (dPers > 0) {
      out.push({ tone: m.load ? "warn" : "info", text: `+${dPers}% sulla sua media 7g${m.load ? " · picco di carico" : ""}` });
    } else {
      out.push({ tone: "info", text: `${dPers}% sulla sua media 7g` });
    }
  }
  const dTeam = pctDelta(today, teamMean);
  if (dTeam != null && Math.abs(dTeam) >= 20) {
    out.push({ tone: dTeam > 0 ? "info" : "good", text: `${dTeam > 0 ? "+" : ""}${dTeam}% sulla squadra` });
  }
  return out;
}
