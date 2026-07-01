import { getAthletes } from "./data";
import type { Athlete } from "./types";
import {
  RE_CONFIG, DOMS_AREAS, flagFromScore, type ReItem,
  type WellnessEntry, type LoadSession, type Flag, type Severity,
  type LoadDaily, type DayPoint, type ReadinessState,
} from "./readinessEngine-core";

export * from "./readinessEngine-core";

// ============================================================================
// Daily Readiness Engine — generazione dati + calcolo (server). Implementa le
// regole EBM (Spec v1.0): due TRACK SEPARATI (readiness soggettiva vs sRPE),
// baseline INDIVIDUALE con z-score, SWC, EWMA acuto/cronico (NIENTE ACWR), che
// si incrociano solo nella matrice di alert (§6.2). Dati mock DETERMINISTICI
// (seed = atleta); diventeranno tabelle reali col DB mantenendo la stessa forma.
// ============================================================================

// ---- Utilità statistiche ----------------------------------------------------
function mean(xs: number[]): number { return xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length); }
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REF = Date.parse("2026-07-01");
const GEN_DAYS = 40;
const day = (d: number) => new Date(REF + d * 86400000).toISOString().slice(0, 10);
const ITEMS_Z: ReItem[] = ["fatigue", "doms", "sleep_quality", "sleep_hours", "stress", "mood"];

// ---- Generazione dati mock deterministici -----------------------------------
function genAthlete(a: Athlete, clientId: string): { wellness: WellnessEntry[]; load: LoadSession[] } {
  const r = rng(a.shirtNumber * 31 + clientId.length * 101 + a.lastName.length * 7 + 13);
  const baseLvl = a.status === "infortunato" ? 3.6 : a.status === "in recupero" ? 4.4 : a.status === "a riposo" ? 5.0 : 5.6;
  const dipStart = -3 - Math.floor(r() * 8);
  const dipDepth = r() < 0.45 ? 1.2 + r() * 1.6 : 0;
  const wellness: WellnessEntry[] = [];
  const load: LoadSession[] = [];
  const item = (lvl: number, spread: number) => clamp(Math.round(lvl + (r() - 0.5) * spread), 1, 7);
  const skipToday = r() < 0.18; // ~18% non ha ancora compilato il check-in di oggi

  for (let d = -GEN_DAYS + 1; d <= 0; d++) {
    if (d === 0 && skipToday) { /* check-in di oggi non compilato */ } else {
    const inDip = dipDepth > 0 && d >= dipStart && d <= dipStart + 2;
    const lvl = baseLvl - (inDip ? dipDepth : 0);
    const doms = item(lvl, 2.4);
    const domsArea = doms <= RE_CONFIG.doms_area_trigger ? [DOMS_AREAS[Math.floor(r() * DOMS_AREAS.length)]] : [];
    const hasMood = r() > 0.12;
    wellness.push({
      athleteId: a.id,
      date: day(d),
      out_of_window: r() > 0.9,
      fatigue: item(lvl, 2.2),
      sleep_quality: item(lvl + 0.2, 2.0),
      sleep_hours: Number(clamp(7.1 + (lvl - 5) * 0.35 + (r() - 0.5) * 2.4, 3.5, 10).toFixed(1)),
      doms,
      doms_area: domsArea,
      stress: item(lvl + 0.1, 2.2),
      mood: hasMood ? item(lvl + 0.3, 1.8) : null,
      data_quality_flag: null,
    });
    }

    const dow = (d % 7 + 7) % 7;
    const rest = dow === 0 || (dow === 3 && r() > 0.5);
    if (!rest) {
      const isMatch = dow === 6;
      const rpe = Number(clamp(isMatch ? 8 + r() * 1.5 : 3.5 + r() * 4.5, 0, 10).toFixed(1));
      const dur = isMatch ? 90 : 50 + Math.round(r() * 45);
      load.push({
        id: `${a.id}-ls-${d + GEN_DAYS}`,
        athleteId: a.id,
        date: day(d),
        rpe,
        duration_min: dur,
        session_load: Math.round(rpe * dur),
        session_type: isMatch ? "partita" : dow === 1 ? "palestra" : "allenamento",
      });
    }
  }
  return { wellness, load };
}

// ---- Calcolo ----------------------------------------------------------------
function baselineFor(entries: WellnessEntry[], upto: string): { valid: number; stats: Partial<Record<ReItem, { mean: number; sd: number }>> } {
  const start = new Date(Date.parse(upto) - RE_CONFIG.baseline_window_days * 86400000).toISOString().slice(0, 10);
  const win = entries.filter((e) => e.date >= start && e.date < upto);
  const stats: Partial<Record<ReItem, { mean: number; sd: number }>> = {};
  for (const it of ITEMS_Z) {
    const vals = win.map((e) => e[it as keyof WellnessEntry] as number | null).filter((v): v is number => typeof v === "number");
    if (vals.length) stats[it] = { mean: mean(vals), sd: sd(vals) };
  }
  return { valid: win.length, stats };
}

function weightedZ(z: Partial<Record<ReItem, number>>): number {
  const present = (Object.keys(RE_CONFIG.weights) as ReItem[]).filter((k) => z[k] != null);
  const wsum = present.reduce((s, k) => s + RE_CONFIG.weights[k], 0) || 1;
  return present.reduce((s, k) => s + (RE_CONFIG.weights[k] / wsum) * (z[k] as number), 0);
}

function flagFromZ(zc: number): Flag {
  if (zc <= RE_CONFIG.z_red) return "red";
  if (zc <= RE_CONFIG.z_amber) return "amber";
  return "green";
}
function worse(a: Flag, b: Flag): Flag {
  const rank: Record<Flag, number> = { green: 0, amber: 1, red: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function computeLoad(load: LoadSession[], upto: string): { daily: Record<string, number>; today: LoadDaily } {
  const daily: Record<string, number> = {};
  for (let d = -GEN_DAYS + 1; d <= 0; d++) daily[day(d)] = 0;
  for (const s of load) if (daily[s.date] != null) daily[s.date] += s.session_load;

  const sumRange = (from: number, to: number) => {
    let s = 0;
    for (let d = from; d <= to; d++) s += daily[day(d)] ?? 0;
    return s;
  };
  const uptoIdx = Math.round((Date.parse(upto) - REF) / 86400000);
  const weekly = sumRange(uptoIdx - 6, uptoIdx);
  const prevWeekly = sumRange(uptoIdx - 13, uptoIdx - 7);
  const wowPct = prevWeekly > 0 ? Math.round(((weekly - prevWeekly) / prevWeekly) * 100) : 0;

  const la = 2 / (RE_CONFIG.ewma_acute_N + 1);
  const lc = 2 / (RE_CONFIG.ewma_chronic_N + 1);
  let ea = daily[day(-GEN_DAYS + 1)] ?? 0;
  let ec = ea;
  for (let d = -GEN_DAYS + 2; d <= uptoIdx; d++) {
    const dl = daily[day(d)] ?? 0;
    ea = dl * la + (1 - la) * ea;
    ec = dl * lc + (1 - lc) * ec;
  }
  const spike = wowPct > RE_CONFIG.load_spike_pct;
  return { daily, today: { daily: daily[upto] ?? 0, weekly, prevWeekly, wowPct, ewmaAcute: Math.round(ea), ewmaChronic: Math.round(ec), spike } };
}

/** Matrice READINESS × LOAD (§6.2) + priorità severità (§6.6). */
function decide(flag: Flag, load: LoadDaily, clinical: string[] | null, quality: "flatline" | null): { severity: Severity; category: string; message: string } {
  if (clinical && clinical.length) return { severity: "clinical", category: "Red flag clinico", message: `DOMS localizzato severo (${clinical.join(", ")}) — notifica diretta allo staff medico.` };
  const loadHigh = load.spike || (load.ewmaChronic > 0 && load.ewmaAcute > load.ewmaChronic * 1.25);
  if (flag === "red" || flag === "amber") {
    if (loadHigh) return { severity: flag as Severity, category: "Fatica da allenamento", message: "Prontezza sotto la norma con carico recente alto → valuta riduzione/modifica del carico odierno." };
    return { severity: flag as Severity, category: "Stressor non da allenamento", message: "Prontezza sotto la norma ma carico normale → indaga sonno, malattia o fattori extra-campo." };
  }
  if (quality === "flatline") return { severity: "quality", category: "Qualità del dato", message: "Risposte identiche da più giorni: possibile compilazione non attendibile, verifica con l'atleta." };
  if (loadHigh) return { severity: "green", category: "Nella norma", message: "Prontezza nella norma con carico alto pianificato → procedi come da programma." };
  return { severity: "green", category: "Nella norma", message: "Prontezza nella norma → nessuna azione." };
}

function markFlatline(wellness: WellnessEntry[]): void {
  const key = (e: WellnessEntry) => `${e.fatigue}-${e.doms}-${e.sleep_quality}-${e.stress}-${e.mood ?? "x"}`;
  let run = 0;
  for (let i = 0; i < wellness.length; i++) {
    run = i > 0 && key(wellness[i]) === key(wellness[i - 1]) ? run + 1 : 1;
    if (run >= RE_CONFIG.flatline_days) for (let j = i - run + 1; j <= i; j++) wellness[j].data_quality_flag = "flatline";
  }
}

function computeState(a: Athlete, clientId: string): ReadinessState {
  const { wellness, load } = genAthlete(a, clientId);
  markFlatline(wellness);
  const byDate = new Map(wellness.map((e) => [e.date, e]));
  const loadCalc = computeLoad(load, day(0));
  const loadToday = loadCalc.today;
  const dailyLoad = loadCalc.daily;

  const dayState = (date: string) => {
    const e = byDate.get(date);
    if (!e) return { readinessZ: null as number | null, score: null as number | null, flag: "green" as Flag, z: null as Partial<Record<ReItem, number>> | null, baselineValid: 0 };
    const bl = baselineFor(wellness, date);
    if (bl.valid < RE_CONFIG.min_baseline_days) {
      const red = e.fatigue <= 2 || e.doms <= 2 || e.sleep_hours < RE_CONFIG.abs_sleep_red;
      return { readinessZ: null as number | null, score: null as number | null, flag: (red ? "red" : "green") as Flag, z: null as Partial<Record<ReItem, number>> | null, baselineValid: bl.valid };
    }
    const z: Partial<Record<ReItem, number>> = {};
    for (const it of ITEMS_Z) {
      const st = bl.stats[it];
      const val = e[it as keyof WellnessEntry] as number | null;
      if (st && val != null) z[it] = (val - st.mean) / Math.max(st.sd, RE_CONFIG.min_sd_floor);
    }
    let zc = weightedZ(z);
    let flag = flagFromZ(zc);
    if ((z.fatigue != null && z.fatigue <= RE_CONFIG.z_item_red) || (z.doms != null && z.doms <= RE_CONFIG.z_item_red)) flag = worse(flag, "amber");
    zc = Number(zc.toFixed(2));
    const score = Math.round(clamp(50 + RE_CONFIG.display_scale * zc, 0, 100));
    return { readinessZ: zc, score, flag, z, baselineValid: bl.valid };
  };

  const today = dayState(day(0));
  const entry = byDate.get(day(0)) ?? null;
  const clinical = entry && entry.doms <= RE_CONFIG.doms_red && entry.doms_area.length ? entry.doms_area : null;
  const dataQuality = entry?.data_quality_flag ?? null;
  const itemAlert = !!(today.z && ((today.z.fatigue != null && today.z.fatigue <= RE_CONFIG.z_item_red) || (today.z.doms != null && today.z.doms <= RE_CONFIG.z_item_red)));

  let missing7 = 0;
  for (let d = -6; d <= 0; d++) if (!byDate.has(day(d))) missing7++;

  const history: DayPoint[] = [];
  for (let d = -13; d <= 0; d++) {
    const s = dayState(day(d));
    history.push({ date: day(d), readinessZ: s.readinessZ, score: s.score, flag: s.flag, dailyLoad: dailyLoad[day(d)] ?? 0 });
  }

  const alert = decide(today.flag, loadToday, clinical, dataQuality);

  // Variazione vs GIORNO PRECEDENTE (non vs primo rilevamento) + ultimo dato noto.
  const yScore = history[history.length - 2]?.score ?? null;
  const deltaVsPrev = today.score != null && yScore != null ? today.score - yScore : null;
  let lastScore: number | null = null;
  let lastFlag: Flag = "green";
  for (let i = history.length - 1; i >= 0; i--) { if (history[i].score != null) { lastScore = history[i].score; lastFlag = history[i].flag; break; } }

  return {
    athlete: a,
    date: day(0),
    baselineStatus: today.baselineValid >= RE_CONFIG.min_baseline_days ? "ready" : "provisional",
    baselineValidDays: today.baselineValid,
    compiledToday: entry != null,
    deltaVsPrev,
    lastScore,
    lastFlag,
    entry,
    z: today.z,
    readinessZ: today.readinessZ,
    readinessScore: today.score,
    flag: today.flag,
    clinicalFlag: clinical,
    itemAlert,
    dataQuality,
    compliance: { missing7, alert: missing7 >= RE_CONFIG.compliance_alert_days },
    load: loadToday,
    alert,
    history,
  };
}

// ---- API --------------------------------------------------------------------
const CACHE = new Map<string, ReadinessState[]>();

export function getReadinessEngine(clientId: string): ReadinessState[] {
  if (!CACHE.has(clientId)) CACHE.set(clientId, getAthletes(clientId).map((a) => computeState(a, clientId)));
  return CACHE.get(clientId)!;
}

export function getAthleteReadinessState(clientId: string, athleteId: string): ReadinessState | null {
  return getReadinessEngine(clientId).find((s) => s.athlete.id === athleteId) ?? null;
}

/** Aggregato di SQUADRA (14 giorni): media giornaliera corretta (z→score), variazione
 *  vs GIORNO PRECEDENTE, media 14 giorni, distribuzione flag e non-compilati. */
export function getReadinessTeam(clientId: string): import("./readinessEngine-core").TeamReadiness {
  const states = getReadinessEngine(clientId);
  const dates = states[0]?.history.map((h) => h.date) ?? [];
  const days = dates.map((date, i) => {
    const scores = states.map((s) => s.history[i]?.score).filter((v): v is number => v != null);
    return { date, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, n: scores.length };
  });
  const todayAvg = days[days.length - 1]?.avg ?? null;
  const yestAvg = days[days.length - 2]?.avg ?? null;
  const delta = todayAvg != null && yestAvg != null ? todayAvg - yestAvg : null;
  const valid = days.map((d) => d.avg).filter((v): v is number => v != null);
  const avg14 = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;

  // Conteggio flag COERENTE col punteggio mostrato (flagFromScore), non col flag
  // composito (che includerebbe l'override "item critico" → numero e colore divergerebbero).
  const flagCounts = { green: 0, amber: 0, red: 0 };
  let notCompiled = 0;
  for (const s of states) {
    if (!s.compiledToday) notCompiled++;
    else if (s.readinessScore != null) flagCounts[flagFromScore(s.readinessScore)]++;
  }
  return { days, todayAvg, delta, avg14, flagCounts, notCompiled, total: states.length };
}
