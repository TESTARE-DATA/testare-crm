"use client";

import { useEffect, useMemo, useState } from "react";
import type { Athlete, CalendarEvent, DaySlot, PhysioDiaryEntry, SessionType, TemplateDomain, ExerciseDomain, WorkAssignment } from "@/lib/types";
import { SESSION_META, SESSION_TYPES } from "@/lib/sessions";
import { TYPE_LOAD, dayLoad, mdCode, mdColor } from "@/lib/microcycle";
import { objectiveMeta } from "@/lib/objectives";
import { type AttendanceRec, type SessionEntry, assignmentToSession, eventToSession } from "@/lib/attendance";
import { useLocalCollection, newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { AssignModal } from "@/components/programmazione/AssignButton";
import { AttendanceRecorder } from "@/components/attendance/AttendanceRecorder";

type ExRef = { id: string; name: string; domain: ExerciseDomain; durationMin: number; category: string };
type TplRef = { id: string; name: string; domain: TemplateDomain; durationMin: number; rpe: number; items: { exerciseId: string; name: string; durationMin?: number }[] };

// "Altre attività" del giorno: lavoro individuale/di reparto sopra al piano squadra.
type Other =
  | { t: "event"; key: string; e: CalendarEvent }
  | { t: "assignment"; key: string; a: WorkAssignment }
  | { t: "therapy"; key: string; th: PhysioDiaryEntry; name: string };
const THERAPY_COLOR = "var(--med)";
const VISITA_COLOR = "#7c3aed";

const DOW = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
// Data di riferimento dei dati seed: fallback deterministico per SSR/hydration.
// Dopo il mount `today` diventa la data reale di oggi (vedi CalendarClient).
const SEED_TODAY = "2026-06-19";
const DAY = 86400000;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
/** Data odierna reale (componenti locali) nel formato YYYY-MM-DD. */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(iso: string, weekOffset = 0) {
  const d = new Date(iso + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + weekOffset * 7);
  return d;
}

export function CalendarClient({
  clientId,
  seed,
  athletes,
  templates,
  exercises,
  seedAttendance,
  seedTherapies,
}: {
  clientId: string;
  seed: CalendarEvent[];
  athletes: Athlete[];
  templates: TplRef[];
  exercises: ExRef[];
  seedAttendance: AttendanceRec[];
  seedTherapies: PhysioDiaryEntry[];
}) {
  const { items: local, add, remove } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { items: localTherapies } = useDbCollection<PhysioDiaryEntry>(`physio-diary:${clientId}`, seedTherapies);
  const [view, setView] = useState<"microciclo" | "mese">("microciclo");
  const [weekOffset, setWeekOffset] = useState(0);
  // Calendario "live": parte dal seed (SSR) e dopo il mount si allinea a oggi.
  const [today, setToday] = useState(SEED_TODAY);
  useEffect(() => setToday(todayISO()), []);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<SessionEntry | null>(null);
  const [picker, setPicker] = useState<string | null>(null); // data per cui assegnare lavoro

  const allIds = useMemo(() => athletes.map((a) => a.id), [athletes]);
  const athById = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);
  const events = useMemo(() => [...seed, ...local], [seed, local]);
  const localIds = new Set(local.map((e) => e.id));
  const matchDates = useMemo(() => events.filter((e) => e.sessionType === "partita").map((e) => e.date), [events]);

  // Tutti gli eventi del giorno (per il modale "In programma").
  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    for (const list of m.values()) list.sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "mattina" ? -1 : 1));
    return m;
  }, [events]);

  // SQUADRA: solo le sedute di tutta la rosa.
  const squadraByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (e.assignment !== "squadra") continue;
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    }
    for (const list of m.values()) list.sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "mattina" ? -1 : 1));
    return m;
  }, [events]);

  // ALTRE ATTIVITÀ: gruppo differenziato + lavori assegnati + terapie (Area Medica).
  const therapies = useMemo(() => {
    const seen = new Set(localTherapies.map((t) => t.id));
    return [...localTherapies, ...seedTherapies.filter((t) => !seen.has(t.id))];
  }, [localTherapies, seedTherapies]);
  const otherByDay = useMemo(() => {
    const m = new Map<string, Other[]>();
    const push = (date: string, o: Other) => { if (!m.has(date)) m.set(date, []); m.get(date)!.push(o); };
    for (const e of events) if (e.assignment === "gruppo") push(e.date, { t: "event", key: e.id, e });
    for (const a of assignments) push(a.date, { t: "assignment", key: a.id, a });
    for (const th of therapies) push(th.date, { t: "therapy", key: th.id, th, name: athById.get(th.athleteId)?.lastName ?? "Atleta" });
    return m;
  }, [events, assignments, therapies, athById]);

  const openEvent = (e: CalendarEvent) => setSelected(eventToSession(e, allIds));
  const openAssignment = (a: WorkAssignment) => setSelected(assignmentToSession(a));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl"><Icon name="calendar" size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
            <p className="mt-0.5 text-sm text-muted">Periodizzazione del microciclo · codifica MD e carico settimanale</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <ViewBtn active={view === "microciclo"} onClick={() => setView("microciclo")} label="Microciclo" />
            <ViewBtn active={view === "mese"} onClick={() => setView("mese")} label="Mese" />
          </div>
          <button onClick={() => setPicker(today)} className="brand-bg brand-on flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm"><Icon name="plus" size={16} /> Assegna</button>
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-4 flex flex-wrap gap-3">
        {SESSION_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SESSION_META[t].color }} />{SESSION_META[t].label}</span>
        ))}
      </div>

      {view === "microciclo" ? (
        <Microciclo
          today={today} weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          squadraByDay={squadraByDay} otherByDay={otherByDay} matchDates={matchDates}
          onEvent={openEvent} onAssignment={openAssignment} onAssign={setPicker}
        />
      ) : (
        <Mese today={today} squadraByDay={squadraByDay} otherByDay={otherByDay} onPick={setModalDate} onEvent={openEvent} onAssignment={openAssignment} />
      )}

      {modalDate && (
        <EventModal
          clientId={clientId} date={modalDate} athletes={athletes} templates={templates}
          dayEvents={eventsByDay.get(modalDate) ?? []} localIds={localIds}
          onClose={() => setModalDate(null)} onAdd={add} onRemove={remove} onOpenEvent={(e) => { setModalDate(null); openEvent(e); }}
          onAssignPick={(d) => { setModalDate(null); setPicker(d); }}
        />
      )}

      {picker && (
        <AssignModal clientId={clientId} athletes={athletes} options={{ exercises, templates }} defaultDate={picker} onClose={() => setPicker(null)} />
      )}

      {selected && <AttendanceRecorder clientId={clientId} session={selected} athletes={athletes} seedAttendance={seedAttendance} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ---- Vista MICROCICLO -------------------------------------------------------
function Microciclo({
  today, weekOffset, setWeekOffset, squadraByDay, otherByDay, matchDates, onEvent, onAssignment, onAssign,
}: {
  today: string; weekOffset: number; setWeekOffset: (n: number) => void;
  squadraByDay: Map<string, CalendarEvent[]>; otherByDay: Map<string, Other[]>; matchDates: string[];
  onEvent: (e: CalendarEvent) => void; onAssignment: (a: WorkAssignment) => void; onAssign: (d: string) => void;
}) {
  const monday = mondayOf(today, weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => toISO(new Date(monday.getTime() + i * DAY)));
  const loads = days.map((d) => dayLoad(squadraByDay.get(d) ?? []));
  const weekLoad = loads.reduce((s, l) => s + l, 0);
  const maxLoad = Math.max(1, ...loads);
  const sessions = days.reduce((s, d) => s + (squadraByDay.get(d)?.filter((e) => e.sessionType !== "riposo").length ?? 0), 0);
  const peakIdx = loads.indexOf(Math.max(...loads));
  const rangeLabel = `${fmtShort(days[0])} – ${fmtShort(days[6])}`;

  return (
    <>
      {/* Barra settimana + sintesi */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="rounded-lg border border-border p-2 hover:bg-background"><Icon name="arrowLeft" size={16} /></button>
          <span className="min-w-[160px] text-center text-sm font-semibold">{rangeLabel}</span>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="rounded-lg border border-border p-2 hover:bg-background"><Icon name="chevron" size={16} /></button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="brand-text ml-1 text-[13px] font-semibold hover:underline">Oggi</button>}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Summary label="Carico settimanale" value={`${weekLoad} AU`} />
          <Summary label="Sedute" value={`${sessions}`} />
          <Summary label="Picco" value={loads[peakIdx] > 0 ? DOW[peakIdx] : "—"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {days.map((d, i) => {
          const list = squadraByDay.get(d) ?? [];
          const others = otherByDay.get(d) ?? [];
          const md = mdCode(d, matchDates);
          const isToday = d === today;
          const load = loads[i];
          return (
            <div
              key={d}
              className={`card flex flex-col overflow-hidden ${isToday ? "border-[var(--brand-primary)]" : ""}`}
              style={isToday ? { boxShadow: "0 0 0 2px var(--brand-primary), 0 10px 28px -10px var(--brand-primary)" } : undefined}
            >
              <div className="flex items-center justify-between px-3 pt-3">
                <div>
                  <div className="text-[11px] font-medium text-muted-2">{DOW[i]} {d.slice(8, 10)}</div>
                  {isToday && <div className="brand-text text-[10px] font-bold uppercase">oggi</div>}
                </div>
                <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: mdColor(md.offset) }}>{md.code}</span>
              </div>

              {/* barra carico */}
              <div className="px-3 pt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full" style={{ width: `${(load / maxLoad) * 100}%`, backgroundColor: load > 0 ? "var(--brand-primary)" : "transparent" }} />
                </div>
                <div className="mt-0.5 text-right text-[10px] text-muted-2">{load} AU</div>
              </div>

              {/* SQUADRA */}
              <div className="flex-1 space-y-2 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-2">Squadra</div>
                {(["mattina", "pomeriggio"] as DaySlot[]).map((slot) => {
                  const ev = list.filter((e) => e.slot === slot);
                  return (
                    <div key={slot}>
                      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-2/70">{slot === "mattina" ? "AM" : "PM"}</div>
                      {ev.length === 0 ? (
                        <button onClick={() => onAssign(d)} className="w-full rounded-lg border border-dashed border-border py-1.5 text-[11px] font-medium text-muted-2 hover:border-[var(--brand-primary)] hover:text-foreground">+ Assegna</button>
                      ) : ev.map((e) => {
                        const meta = SESSION_META[e.sessionType];
                        return (
                          <button key={e.id} onClick={() => onEvent(e)} className="mb-1 block w-full rounded-lg p-1.5 text-left text-white transition-transform hover:scale-[1.02]" style={{ backgroundColor: meta.color }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-[11px] font-semibold">{e.title}</span>
                              {e.time && <span className="text-[9px] opacity-80">{e.time}</span>}
                            </div>
                            <div className="truncate text-[9px] opacity-85">{e.objective ?? meta.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* ALTRE ATTIVITÀ: differenziato · lavori assegnati · terapie */}
                {others.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-muted-2">Altre attività</div>
                    <div className="space-y-1">
                      {others.map((o) => <OtherItem key={o.key} o={o} onEvent={onEvent} onAssignment={onAssignment} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted-2">
        Codifica <b>MD</b> = giorni rispetto alla partita (MD = gara, MD-3 = tre giorni prima, MD+1 = giorno dopo). Il carico (AU) guida la forma del microciclo: picco a centro settimana, scarico in avvicinamento alla gara.
      </p>
    </>
  );
}

// ---- Vista MESE -------------------------------------------------------------
function Mese({ today, squadraByDay, otherByDay, onPick, onEvent, onAssignment }: { today: string; squadraByDay: Map<string, CalendarEvent[]>; otherByDay: Map<string, Other[]>; onPick: (d: string) => void; onEvent: (e: CalendarEvent) => void; onAssignment: (a: WorkAssignment) => void }) {
  const start = mondayOf(today, 0);
  const days = Array.from({ length: 35 }, (_, i) => toISO(new Date(start.getTime() + i * DAY)));
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-background">
        {DOW.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const list = squadraByDay.get(day) ?? [];
          const others = otherByDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <button key={day} onClick={() => onPick(day)} className={`group relative min-h-28 border-b border-r border-border p-1.5 text-left align-top last:border-r-0 hover:bg-background ${isToday ? "ring-2 ring-inset ring-[var(--brand-primary)]" : ""}`}>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className={`text-[12px] font-semibold ${isToday ? "brand-text" : "text-muted-2"}`}>{day.slice(8, 10)}</span>
                {isToday && <span className="brand-bg h-1.5 w-1.5 rounded-full" />}
              </div>
              <div className="space-y-1">
                {list.map((e) => {
                  const meta = SESSION_META[e.sessionType];
                  return (
                    <span key={e.id} onClick={(ev) => { ev.stopPropagation(); onEvent(e); }} className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: meta.color }} title={`${e.title} · ${e.slot}`}>
                      <span className="opacity-80">{e.slot === "mattina" ? "AM" : "PM"}</span><span className="truncate">{e.title}</span>
                    </span>
                  );
                })}
                {others.map((o) => <MeseOther key={o.key} o={o} onEvent={onEvent} onAssignment={onAssignment} />)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Chip compatto delle "altre attività" nella vista Mese.
function MeseOther({ o, onEvent, onAssignment }: { o: Other; onEvent: (e: CalendarEvent) => void; onAssignment: (a: WorkAssignment) => void }) {
  if (o.t === "event") {
    const meta = SESSION_META[o.e.sessionType];
    return <span onClick={(ev) => { ev.stopPropagation(); onEvent(o.e); }} className="flex cursor-pointer items-center gap-1 rounded border border-l-[3px] border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium" style={{ borderLeftColor: meta.color }} title={`${o.e.title} · differenziato`}><span className="truncate">{o.e.title}</span></span>;
  }
  if (o.t === "assignment") {
    const meta = SESSION_META[o.a.sessionType ?? "campo"];
    return <span onClick={(ev) => { ev.stopPropagation(); onAssignment(o.a); }} className="flex cursor-pointer items-center gap-1 rounded border border-l-[3px] border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium" style={{ borderLeftColor: meta.color }} title={`${o.a.refName} · assegnato`}><span className="truncate">{o.a.refName}</span></span>;
  }
  const color = o.th.kind === "visita" ? VISITA_COLOR : THERAPY_COLOR;
  return <span className="flex items-center gap-1 rounded border border-l-[3px] border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium" style={{ borderLeftColor: color }} title={`${o.name} · ${o.th.treatment}`}><Icon name="medical" size={10} style={{ color }} /><span className="truncate">{o.name}</span></span>;
}

// Riga "altra attività" nella vista Microciclo (differenziato · assegnato · terapia).
function OtherItem({ o, onEvent, onAssignment }: { o: Other; onEvent: (e: CalendarEvent) => void; onAssignment: (a: WorkAssignment) => void }) {
  if (o.t === "event") {
    const meta = SESSION_META[o.e.sessionType];
    return (
      <button onClick={() => onEvent(o.e)} className="block w-full rounded-lg border border-l-[3px] border-border bg-surface p-1.5 text-left transition-transform hover:scale-[1.02]" style={{ borderLeftColor: meta.color }}>
        <div className="truncate text-[11px] font-semibold text-foreground">{o.e.title}</div>
        <div className="truncate text-[9px] text-muted">Differenziato · {o.e.groupAthleteIds?.length ?? 0} atl.</div>
      </button>
    );
  }
  if (o.t === "assignment") {
    const meta = SESSION_META[o.a.sessionType ?? "campo"];
    return (
      <button onClick={() => onAssignment(o.a)} className="block w-full rounded-lg border border-l-[3px] border-border bg-surface p-1.5 text-left transition-transform hover:scale-[1.02]" style={{ borderLeftColor: meta.color }}>
        <div className="truncate text-[11px] font-semibold text-foreground">{o.a.refName}</div>
        <div className="truncate text-[9px] text-muted">{o.a.objective ?? meta.label} · {o.a.athleteIds.length} atl.</div>
      </button>
    );
  }
  const isVisita = o.th.kind === "visita";
  const color = isVisita ? VISITA_COLOR : THERAPY_COLOR;
  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-l-[3px] border-border bg-surface p-1.5" style={{ borderLeftColor: color }} title={`${o.name} · ${o.th.treatment}`}>
      <Icon name="medical" size={11} className="mt-0.5 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-foreground">{o.name}</div>
        <div className="truncate text-[9px]" style={{ color }}>{isVisita ? "Visita" : "Terapia"} · {o.th.treatment}</div>
      </div>
    </div>
  );
}

// ---- Modal evento -----------------------------------------------------------
function EventModal({
  clientId, date, athletes, templates, dayEvents, localIds, onClose, onAdd, onRemove, onOpenEvent, onAssignPick,
}: {
  clientId: string; date: string; athletes: Athlete[]; templates: TplRef[];
  dayEvents: CalendarEvent[]; localIds: Set<string>; onClose: () => void; onAdd: (e: CalendarEvent) => void; onRemove: (id: string) => void; onOpenEvent: (e: CalendarEvent) => void;
  onAssignPick: (date: string) => void;
}) {
  const [form, setForm] = useState({ title: "", slot: "mattina" as DaySlot, time: "", sessionType: "campo" as SessionType, location: "", assignment: "squadra" as "squadra" | "gruppo", templateId: "" });
  const [group, setGroup] = useState<string[]>([]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title.trim()) return;
    onAdd({
      id: newId(`${clientId}-ev`), clientId, title: form.title, date, slot: form.slot,
      time: form.time || undefined, sessionType: form.sessionType, location: form.location || undefined,
      assignment: form.assignment, groupAthleteIds: form.assignment === "gruppo" ? group : undefined,
      templateId: form.templateId || undefined,
    });
    onClose();
  };
  const toggle = (id: string) => setGroup((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  return (
    <Modal onClose={onClose} size="xl">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-bold">{fmtLong(date)}</h2>
          <p className="text-[12px] text-muted">{dayEvents.length} eventi · carico {dayLoad(dayEvents)} AU</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-background">✕</button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-2">In programma</h3>
            {dayEvents.length === 0 ? <p className="text-sm text-muted">Nessun evento.</p> : (
              <ul className="space-y-2">
                {dayEvents.map((e) => {
                  const meta = SESSION_META[e.sessionType];
                  return (
                    <li key={e.id} className="flex items-center gap-2 rounded-lg border border-border p-2 hover:border-[var(--brand-primary)]">
                      <span className="h-7 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <button onClick={() => onOpenEvent(e)} className="flex-1 text-left">
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="text-[11px] text-muted">{e.slot}{e.time ? ` ${e.time}` : ""} · {meta.label} · {TYPE_LOAD[e.sessionType]} AU · {e.assignment === "gruppo" ? `gruppo (${e.groupAthleteIds?.length ?? 0})` : "squadra"}</div>
                      </button>
                      <span className="text-[10px] font-semibold text-brand brand-text">presenze →</span>
                      {localIds.has(e.id) && <button onClick={() => onRemove(e.id)} className="rounded p-1 text-muted hover:text-red-600" title="Elimina">✕</button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            {/* Assegna lavoro: apre lo stesso modal di Esercizi/Template (prescrizione, obiettivo, atleti) */}
            <button onClick={() => onAssignPick(date)} className="brand-bg brand-on mb-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm">
              <Icon name="target" size={16} /> Assegna lavoro (prescrizione)
            </button>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Oppure · evento seduta</h3>
            <div className="space-y-3">
              <input className="inp" placeholder="Titolo (es. Forza arti inferiori)" value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <select className="inp" value={form.slot} onChange={(e) => set("slot", e.target.value)}><option value="mattina">Mattina</option><option value="pomeriggio">Pomeriggio</option></select>
                <input type="time" className="inp" value={form.time} onChange={(e) => set("time", e.target.value)} />
              </div>
              <select className="inp" value={form.sessionType} onChange={(e) => set("sessionType", e.target.value)}>
                {SESSION_TYPES.map((t) => <option key={t} value={t}>{SESSION_META[t].label}</option>)}
              </select>
              <input className="inp" placeholder="Luogo (opzionale)" value={form.location} onChange={(e) => set("location", e.target.value)} />
              {templates.length > 0 && (
                <select className="inp" value={form.templateId} onChange={(e) => set("templateId", e.target.value)}>
                  <option value="">Collega un template (opzionale)</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                {(["squadra", "gruppo"] as const).map((a) => (
                  <button key={a} onClick={() => set("assignment", a)} className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium ${form.assignment === a ? "brand-bg brand-on border-transparent" : "border-border hover:bg-background"}`}>{a === "squadra" ? "Tutta la squadra" : "Gruppo differenziato"}</button>
                ))}
              </div>
              {form.assignment === "gruppo" && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  <div className="mb-1 text-[11px] text-muted">{group.length} selezionati</div>
                  {athletes.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-background">
                      <input type="checkbox" checked={group.includes(a.id)} onChange={() => toggle(a.id)} />
                      <span className="font-mono text-[11px] text-muted">{a.shirtNumber}</span>{a.lastName}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Chiudi</button>
              <button onClick={submit} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Aggiungi</button>
            </div>
          </div>
        </div>
    </Modal>
  );
}

function ViewBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>{label}</button>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="text-right"><div className="text-[11px] text-muted-2">{label}</div><div className="font-bold">{value}</div></div>;
}
function fmtShort(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" }); }
function fmtLong(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
