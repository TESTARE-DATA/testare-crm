"use client";

// ============================================================================
// Registro presenze — modello unificato di SEDUTA (eventi calendario + lavori
// assegnati), set di stati per tipo, aggregazioni per obiettivo/atleta e hook
// di persistenza (seed deterministico + override locale in localStorage).
// ============================================================================

import { useCallback } from "react";
import type { Athlete, AthleteStatus, CalendarEvent, DaySlot, SessionType, WorkAssignment } from "./types";
import { TYPE_LOAD } from "./microcycle";
import { objectiveMeta } from "./objectives";
import { useLocalCollection } from "./store";

// Quota di carico assorbita in base alla presenza: presente pieno, differenziato
// a metà, assente nullo. È il ponte presenze → carico ("carico assorbito").
export const PRESENCE_LOAD_FACTOR: Record<AttendanceBucket, number> = { present: 1, partial: 0.5, absent: 0 };

/** Stato di presenza suggerito in automatico dallo stato medico dell'atleta
 *  (aggancio Area Medica): infortunato → fuori, in recupero → differenziato. */
export function medicalDefault(type: SessionType, status: AthleteStatus): string | undefined {
  if (status === "infortunato") return type === "partita" ? "non entrato" : "assente";
  if (status === "in recupero") return type === "partita" ? "non entrato" : "differenziato";
  return undefined;
}

// ---- Stati di presenza per tipo di seduta -----------------------------------
export type AttendanceBucket = "present" | "partial" | "absent";
export interface StatusOpt { v: string; c: string; bucket: AttendanceBucket }

const PRESENTE: StatusOpt = { v: "presente", c: "#16a34a", bucket: "present" };
const DIFF: StatusOpt = { v: "differenziato", c: "#d97706", bucket: "partial" };
const ASSENTE: StatusOpt = { v: "assente", c: "#dc2626", bucket: "absent" };

/** Set di stati di presenza specifico per tipo di seduta. null = nessuna presenza. */
export function statusSetFor(type: SessionType): StatusOpt[] | null {
  switch (type) {
    case "partita":
      return [
        { v: "titolare", c: "#16a34a", bucket: "present" },
        { v: "subentrato", c: "#2563eb", bucket: "present" },
        { v: "spezzone", c: "#d97706", bucket: "partial" },
        { v: "non entrato", c: "#94a3b8", bucket: "absent" },
      ];
    case "campo":
    case "palestra":
    case "recupero":
      return [PRESENTE, DIFF, ASSENTE];
    case "video":
    case "medico":
      return [PRESENTE, ASSENTE];
    case "riposo":
      return null;
  }
}

export function bucketOf(type: SessionType, status?: string): AttendanceBucket | undefined {
  if (!status) return undefined;
  return statusSetFor(type)?.find((s) => s.v === status)?.bucket;
}
export function statusColor(type: SessionType, status?: string): string | undefined {
  if (!status) return undefined;
  return statusSetFor(type)?.find((s) => s.v === status)?.c;
}

// ---- Modello unificato di seduta --------------------------------------------
export interface SessionEntry {
  id: string;
  source: "event" | "assignment";
  date: string;
  slot?: DaySlot;
  time?: string;
  sessionType: SessionType;
  title: string;
  objective?: string;
  location?: string;
  rosterIds: string[]; // atleti coinvolti (squadra → tutti, gruppo → subset)
  estLoad: number;
}

export interface AttendanceRec {
  id: string;
  entries: Record<string, { status: string; minutes?: number }>;
}

export function eventToSession(e: CalendarEvent, allIds: string[]): SessionEntry {
  return {
    id: e.id, source: "event", date: e.date, slot: e.slot, time: e.time,
    sessionType: e.sessionType, title: e.title, objective: e.objective, location: e.location,
    rosterIds: e.assignment === "gruppo" && e.groupAthleteIds ? e.groupAthleteIds : allIds,
    estLoad: TYPE_LOAD[e.sessionType],
  };
}
export function assignmentToSession(a: WorkAssignment): SessionEntry {
  const type = a.sessionType ?? "campo";
  return {
    id: a.id, source: "assignment", date: a.date, slot: undefined, time: undefined,
    sessionType: type, title: a.refName, objective: a.objective,
    rosterIds: a.athleteIds, estLoad: a.estLoad ?? TYPE_LOAD[type],
  };
}

/** Lista unificata e ordinata (più recenti prima) di tutte le sedute. */
export function buildSessions(athletes: Athlete[], events: CalendarEvent[], assignments: WorkAssignment[]): SessionEntry[] {
  const allIds = athletes.map((a) => a.id);
  const list = [...events.map((e) => eventToSession(e, allIds)), ...assignments.map(assignmentToSession)];
  return list.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
}

// ---- Aggregazioni per il registro -------------------------------------------
export interface ObjectiveCount { label: string; acr: string; group: string; color: string; count: number; done: number }
export interface MacroAreaCount { group: string; color: string; count: number }
export interface AthleteStat { athleteId: string; present: number; partial: number; absent: number; recorded: number; rate: number; minutes: number; plannedLoad: number; actualLoad: number; loadAdherence: number }
export interface RegistroStats {
  trainingSessions: number; // sedute non-riposo
  recordedSessions: number; // con almeno una presenza registrata
  avgPresence: number; // % presenze su entry registrate (sedute allenanti)
  plannedLoad: number; // AU assegnati (somma per atleta sulle sedute registrate)
  actualLoad: number;  // AU effettivamente assorbiti (presenza-pesati)
  loadAdherence: number; // % actual/planned
  withObjective: number;
  byObjective: ObjectiveCount[];
  byMacroArea: MacroAreaCount[];
  byType: { type: SessionType; count: number; recorded: number; rate: number }[];
  perAthlete: AthleteStat[];
}

const recordedOf = (rec?: AttendanceRec) => rec && Object.keys(rec.entries).length > 0;

export function computeStats(
  sessions: SessionEntry[],
  attendance: AttendanceRec[],
  athletes: Athlete[],
  // Metadati degli obiettivi PERSONALIZZATI (creati in Programmazione): fallback
  // quando l'obiettivo non è tra quelli preimpostati, così conserva acronimo,
  // colore e macro-area invece di finire in "Altro"/grigio.
  customMeta?: Map<string, { acr: string; color: string; group: string }>,
): RegistroStats {
  const att = new Map(attendance.map((r) => [r.id, r]));
  const training = sessions.filter((s) => s.sessionType !== "riposo");

  // per-obiettivo
  const objMap = new Map<string, ObjectiveCount>();
  for (const s of training) {
    if (!s.objective) continue;
    const m = objectiveMeta(s.objective) ?? customMeta?.get(s.objective);
    const key = s.objective;
    const cur = objMap.get(key) ?? { label: s.objective, acr: m?.acr ?? "—", group: m?.group ?? "Altro", color: m?.color ?? "#64748b", count: 0, done: 0 };
    cur.count += 1;
    if (recordedOf(att.get(s.id))) cur.done += 1;
    objMap.set(key, cur);
  }
  const byObjective = [...objMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // per macro-area
  const areaMap = new Map<string, MacroAreaCount>();
  for (const o of byObjective) {
    const cur = areaMap.get(o.group) ?? { group: o.group, color: o.color, count: 0 };
    cur.count += o.count;
    areaMap.set(o.group, cur);
  }
  const byMacroArea = [...areaMap.values()].sort((a, b) => b.count - a.count);

  // per tipo (conteggio sedute)
  const typeMap = new Map<SessionType, { count: number; recorded: number }>();
  for (const s of training) {
    const cur = typeMap.get(s.sessionType) ?? { count: 0, recorded: 0 };
    cur.count += 1;
    if (recordedOf(att.get(s.id))) cur.recorded += 1;
    typeMap.set(s.sessionType, cur);
  }

  // per atleta + presenza media (squadra e per tipo)
  const stat = new Map<string, AthleteStat>();
  for (const a of athletes) stat.set(a.id, { athleteId: a.id, present: 0, partial: 0, absent: 0, recorded: 0, rate: 0, minutes: 0, plannedLoad: 0, actualLoad: 0, loadAdherence: 0 });
  const typeAtt = new Map<SessionType, { present: number; total: number }>(); // presenza media per tipo
  let entriesTot = 0, presentTot = 0, recordedSessions = 0, plannedLoad = 0, actualLoad = 0;
  for (const s of training) {
    const rec = att.get(s.id);
    if (!recordedOf(rec)) continue;
    recordedSessions += 1;
    const ta = typeAtt.get(s.sessionType) ?? { present: 0, total: 0 };
    for (const [aid, e] of Object.entries(rec!.entries)) {
      const st = stat.get(aid);
      if (!st) continue;
      const b = bucketOf(s.sessionType, e.status);
      if (!b) continue;
      st.recorded += 1;
      st[b] += 1;
      if (e.minutes) st.minutes += e.minutes;
      // carico: assegnato pieno, assorbito pesato dalla presenza
      st.plannedLoad += s.estLoad;
      st.actualLoad += s.estLoad * PRESENCE_LOAD_FACTOR[b];
      plannedLoad += s.estLoad;
      actualLoad += s.estLoad * PRESENCE_LOAD_FACTOR[b];
      entriesTot += 1;
      ta.total += 1;
      if (b === "present") { presentTot += 1; ta.present += 1; }
    }
    typeAtt.set(s.sessionType, ta);
  }
  const perAthlete = [...stat.values()].map((s) => ({
    ...s,
    actualLoad: Math.round(s.actualLoad),
    rate: s.recorded ? Math.round((s.present / s.recorded) * 100) : 0,
    loadAdherence: s.plannedLoad ? Math.round((s.actualLoad / s.plannedLoad) * 100) : 0,
  }));
  const byType = [...typeMap.entries()].map(([type, v]) => {
    const ta = typeAtt.get(type);
    return { type, ...v, rate: ta && ta.total ? Math.round((ta.present / ta.total) * 100) : 0 };
  }).sort((a, b) => b.count - a.count);

  return {
    trainingSessions: training.length,
    recordedSessions,
    avgPresence: entriesTot ? Math.round((presentTot / entriesTot) * 100) : 0,
    plannedLoad: Math.round(plannedLoad),
    actualLoad: Math.round(actualLoad),
    loadAdherence: plannedLoad ? Math.round((actualLoad / plannedLoad) * 100) : 0,
    withObjective: training.filter((s) => s.objective).length,
    byObjective,
    byMacroArea,
    byType,
    perAthlete,
  };
}

// ---- Trend presenza settimanale ---------------------------------------------
const DAY_MS = 86400000;
function mondayISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getTime() - dow * DAY_MS).toISOString().slice(0, 10);
}
/** Presenza media % per settimana (lunedì), sulle sedute registrate. */
export function weeklyPresence(sessions: SessionEntry[], attendance: AttendanceRec[]): { label: string; value: number; week: string }[] {
  const att = new Map(attendance.map((r) => [r.id, r]));
  const wk = new Map<string, { present: number; total: number }>();
  for (const s of sessions) {
    if (s.sessionType === "riposo") continue;
    const rec = att.get(s.id);
    if (!recordedOf(rec)) continue;
    const k = mondayISO(s.date);
    const cur = wk.get(k) ?? { present: 0, total: 0 };
    for (const e of Object.values(rec!.entries)) {
      const b = bucketOf(s.sessionType, e.status);
      if (!b) continue;
      cur.total += 1;
      if (b === "present") cur.present += 1;
    }
    wk.set(k, cur);
  }
  return [...wk.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([week, v]) => ({ week, label: new Date(week + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" }), value: v.total ? Math.round((v.present / v.total) * 100) : 0 }));
}

// ---- Hook presenze: seed deterministico + override locale -------------------
export function useAttendance(clientId: string, seed: AttendanceRec[]) {
  const { items, add, remove, ready } = useLocalCollection<AttendanceRec>(`attendance:${clientId}`);
  const localIds = new Set(items.map((i) => i.id));
  const merged: AttendanceRec[] = [...items, ...seed.filter((s) => !localIds.has(s.id))];
  const byId = useCallback(
    (id: string) => merged.find((r) => r.id === id),
    [merged],
  );
  const save = useCallback(
    (rec: AttendanceRec) => { remove(rec.id); add(rec); },
    [add, remove],
  );
  return { merged, byId, save, ready };
}
