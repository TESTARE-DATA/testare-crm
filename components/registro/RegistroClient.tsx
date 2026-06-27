"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Athlete, CalendarEvent, SessionType, WorkAssignment } from "@/lib/types";
import { SESSION_META, SESSION_TYPES } from "@/lib/sessions";
import {
  type AttendanceRec, type SessionEntry, bucketOf, buildSessions, computeStats, statusSetFor, useAttendance,
} from "@/lib/attendance";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { usePhotos } from "@/lib/usePhotos";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PageHeader, StatCard, Panel } from "@/components/ui";
import { AttendanceRecorder } from "@/components/attendance/AttendanceRecorder";

const REF_TODAY = "2026-06-19"; // riferimento "oggi" coerente col calendario
const DAY = 86400000;
type Period = "week" | "month" | "all";
const PERIODS: { v: Period; label: string }[] = [{ v: "week", label: "Microciclo" }, { v: "month", label: "30 giorni" }, { v: "all", label: "Tutto" }];
const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

export function RegistroClient({ clientId, athletes, seedEvents, seedAttendance, view }: {
  clientId: string; athletes: Athlete[]; seedEvents: CalendarEvent[]; seedAttendance: AttendanceRec[];
  view: "presenze" | "allenamenti";
}) {
  const isPres = view === "presenze";
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { merged: attendance } = useAttendance(clientId, seedAttendance);
  const { photos } = usePhotos(clientId);
  const [selected, setSelected] = useState<SessionEntry | null>(null);
  const [typeFilter, setTypeFilter] = useState<SessionType | "all">("all");
  const [period, setPeriod] = useState<Period>("all");

  const athById = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  // Sedute SVOLTE: passate (<= oggi) OPPURE con presenze registrate. Così qualsiasi
  // seduta a cui segni le presenze dal calendario entra subito nel registro.
  const recordedIds = useMemo(() => new Set(attendance.filter((r) => Object.keys(r.entries).length > 0).map((r) => r.id)), [attendance]);
  const done = useMemo(() => {
    const all = buildSessions(athletes, [...seedEvents, ...localEvents], assignments);
    return all.filter((s) => s.sessionType !== "riposo" && (s.date <= REF_TODAY || recordedIds.has(s.id)));
  }, [athletes, seedEvents, localEvents, assignments, recordedIds]);

  // Finestra del periodo selezionato (microciclo = settimana di riferimento).
  const [pStart, pEnd] = useMemo<[string, string]>(() => {
    if (period === "all") return ["0000-01-01", "9999-12-31"];
    const base = Date.parse(REF_TODAY + "T00:00:00");
    if (period === "month") return [new Date(base - 29 * DAY).toISOString().slice(0, 10), "9999-12-31"];
    const d = new Date(base); const dow = (d.getDay() + 6) % 7;
    const mon = new Date(d.getTime() - dow * DAY);
    return [mon.toISOString().slice(0, 10), new Date(mon.getTime() + 6 * DAY).toISOString().slice(0, 10)];
  }, [period]);
  const periodSessions = useMemo(() => done.filter((s) => s.date >= pStart && s.date <= pEnd), [done, pStart, pEnd]);

  const stats = useMemo(() => computeStats(periodSessions, attendance, athletes), [periodSessions, attendance, athletes]);
  const attById = useMemo(() => new Map(attendance.map((r) => [r.id, r])), [attendance]);

  const maxObj = Math.max(1, ...stats.byObjective.map((o) => o.count));
  // Totale sedute con obiettivo (denominatore per le % "di lavoro fatto").
  const totalObj = useMemo(() => stats.byObjective.reduce((s, o) => s + o.count, 0), [stats.byObjective]);
  const pctObj = (n: number) => (totalObj ? Math.round((n / totalObj) * 100) : 0);
  // Raggruppa gli obiettivi per macro-area, preservando l'ordine per conteggio.
  const areas = useMemo(() => {
    const m = new Map<string, { group: string; color: string; total: number; items: typeof stats.byObjective }>();
    for (const o of stats.byObjective) {
      const cur = m.get(o.group) ?? { group: o.group, color: o.color, total: 0, items: [] };
      cur.total += o.count; cur.items.push(o); m.set(o.group, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [stats.byObjective]);

  const log = useMemo(() => periodSessions.filter((s) => typeFilter === "all" || s.sessionType === typeFilter), [periodSessions, typeFilter]);
  const ranked = useMemo(() => [...stats.perAthlete].filter((s) => s.recorded > 0).sort((a, b) => b.rate - a.rate || b.recorded - a.recorded), [stats.perAthlete]);

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader
        icon={isPres ? "users" : "clipboard"}
        title={isPres ? "Presenze atleti" : "Allenamenti svolti"}
        subtitle={isPres
          ? "Presenza per atleta · carico assorbito e statistiche · collegato a calendario e area medica"
          : "Storico delle sedute svolte · per tipo e obiettivo · registra qui le presenze di ogni seduta"}
        actions={
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            {PERIODS.map((p) => (
              <button key={p.v} onClick={() => setPeriod(p.v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${period === p.v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>{p.label}</button>
            ))}
          </div>
        }
      />

      {/* KPI */}
      {isPres ? (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Presenza media" value={`${stats.avgPresence}%`} icon="users" tone={stats.avgPresence >= 85 ? "good" : stats.avgPresence >= 70 ? "default" : "warn"} hint="squadra, sedute allenanti" />
          <StatCard label="Carico assorbito" value={`${stats.loadAdherence}%`} icon="load" tone={stats.loadAdherence >= 90 ? "good" : stats.loadAdherence >= 75 ? "default" : "warn"} hint={`${stats.actualLoad} / ${stats.plannedLoad} AU svolti`} />
          <StatCard label="Atleti con dati" value={ranked.length} icon="users" hint={`su ${athletes.length} in rosa`} />
          <StatCard label="Sedute registrate" value={`${stats.recordedSessions}/${stats.trainingSessions}`} icon="clipboard" tone="brand" hint="presenze inserite" />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Allenamenti svolti" value={stats.trainingSessions} icon="calendar" hint={`${stats.recordedSessions} con presenze`} />
          <StatCard label="Sedute registrate" value={`${stats.recordedSessions}/${stats.trainingSessions}`} icon="clipboard" tone="brand" hint="presenze inserite" />
          <StatCard label="Obiettivi distinti" value={stats.byObjective.length} icon="target" hint={`${areas.length} macro-aree`} />
          <StatCard label="Carico assorbito" value={`${stats.actualLoad} AU`} icon="load" hint={`su ${stats.plannedLoad} pianificati`} />
        </div>
      )}

      {/* Sedute per obiettivo — solo nello storico allenamenti */}
      {!isPres && (
      <Panel title="Sedute per obiettivo" className="mb-5" action={<span className="text-[12px] text-muted">% di lavoro svolto per obiettivo · sul totale delle sedute</span>}>
        {stats.byObjective.length === 0 ? (
          <Empty>Nessun obiettivo registrato. Assegna sedute con un obiettivo dal calendario.</Empty>
        ) : (
          <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
            {areas.map((area) => (
              <div key={area.group}>
                <div className="mb-1.5 flex items-center justify-between border-b border-border pb-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.color }} />{area.group}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: area.color }}>{pctObj(area.total)}%<span className="ml-1 font-normal text-muted-2">· {area.total} sed.</span></span>
                </div>
                <div className="space-y-1">
                  {area.items.map((o) => (
                    <div key={o.label} className="flex items-center gap-2">
                      <span className="flex h-4 min-w-[30px] items-center justify-center rounded px-1 text-[9px] font-bold text-white" style={{ backgroundColor: o.color }}>{o.acr}</span>
                      <span className="w-32 shrink-0 truncate text-[12px] font-medium" title={o.label}>{o.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full" style={{ width: `${(o.count / maxObj) * 100}%`, backgroundColor: o.color }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-[12px] font-bold tabular-nums">{pctObj(o.count)}%</span>
                      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-2">{o.count} sed.</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      {isPres && (
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        {/* Presenza per atleta */}
        <Panel title="Presenza per atleta" action={<span className="text-[12px] text-muted">{ranked.length} atleti con dati</span>}>
          {ranked.length === 0 ? <Empty>Nessuna presenza registrata.</Empty> : (
            <div className="max-h-[460px] overflow-y-auto">
              {ranked.map((s) => {
                const a = athById.get(s.athleteId);
                if (!a) return null;
                const tone = s.rate >= 85 ? "#16a34a" : s.rate >= 70 ? "#d97706" : "#dc2626";
                return (
                  <Link key={s.athleteId} href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-background">
                    <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={42} />
                    <span className="w-32 shrink-0 truncate text-sm font-medium">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></span>
                    <div className="flex flex-1 items-center gap-1.5 text-[11px]">
                      <Pill n={s.present} c="#16a34a" label="P" />
                      <Pill n={s.partial} c="#d97706" label="D" />
                      <Pill n={s.absent} c="#dc2626" label="A" />
                      {s.minutes > 0 && <span className="ml-1 text-muted-2">{s.minutes}′</span>}
                    </div>
                    <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-muted" title="Carico assorbito"><b className="text-foreground">{s.actualLoad}</b> AU</span>
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background"><div className="h-full rounded-full" style={{ width: `${s.rate}%`, backgroundColor: tone }} /></div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-[13px] font-bold tabular-nums" style={{ color: tone }}>{s.rate}%</span>
                    <Icon name="chevron" size={13} className="shrink-0 text-muted-2" />
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Per tipo di seduta */}
        <Panel title="Per tipo di seduta">
          {stats.byType.length === 0 ? <Empty>—</Empty> : (
            <div className="space-y-5 p-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Sedute svolte</div>
                <div className="space-y-2">
                  {stats.byType.map((t) => {
                    const meta = SESSION_META[t.type];
                    const max = Math.max(1, ...stats.byType.map((x) => x.count));
                    return (
                      <div key={t.type} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[13px] font-medium">{meta.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full" style={{ width: `${(t.count / max) * 100}%`, backgroundColor: meta.color }} /></div>
                        <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-muted"><b className="text-foreground">{t.count}</b></span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Presenza media</span>
                  <span className="text-[11px] text-muted-2">% presenti per tipo</span>
                </div>
                <div className="space-y-2">
                  {stats.byType.map((t) => {
                    const meta = SESSION_META[t.type];
                    const tone = t.rate >= 85 ? "#16a34a" : t.rate >= 70 ? "#d97706" : "#dc2626";
                    return (
                      <div key={t.type} className="flex items-center gap-3">
                        <span className="flex w-28 shrink-0 items-center gap-1.5 text-[13px] font-medium"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full" style={{ width: `${t.rate}%`, backgroundColor: tone }} /></div>
                        <span className="w-10 shrink-0 text-right text-[12px] font-bold tabular-nums" style={{ color: tone }}>{t.rate}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
      )}

      {/* Registro sedute — storico allenamenti svolti */}
      {!isPres && (
      <Panel title="Registro sedute" className="mt-5" action={
        <div className="flex flex-wrap items-center gap-1">
          <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="Tutte" />
          {SESSION_TYPES.filter((t) => t !== "riposo").map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} label={SESSION_META[t].label} color={SESSION_META[t].color} />
          ))}
        </div>
      }>
        {log.length === 0 ? <Empty>Nessuna seduta per questo filtro.</Empty> : (
          <div className="max-h-[520px] overflow-y-auto">
            {log.map((s) => {
              const meta = SESSION_META[s.sessionType];
              const rec = attById.get(s.id);
              const opts = statusSetFor(s.sessionType) ?? [];
              const counts = { present: 0, partial: 0, absent: 0 };
              if (rec) for (const e of Object.values(rec.entries)) { const b = bucketOf(s.sessionType, e.status); if (b) counts[b]++; }
              const recorded = rec && Object.keys(rec.entries).length > 0;
              return (
                <button key={s.id} onClick={() => setSelected(s)} className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-background">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                  <div className="w-24 shrink-0">
                    <div className="text-[13px] font-semibold capitalize">{fmt(s.date)}</div>
                    <div className="text-[11px] text-muted-2">{meta.label}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    {s.objective && <div className="truncate text-[12px] brand-text">🎯 {s.objective}</div>}
                  </div>
                  {opts.length === 0 ? <span className="text-[12px] text-muted-2">—</span> : recorded ? (
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
                      <Pill n={counts.present} c="#16a34a" label="P" />
                      <Pill n={counts.partial} c="#d97706" label="D" />
                      <Pill n={counts.absent} c="#dc2626" label="A" />
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">da registrare</span>
                  )}
                  <Icon name="chevron" size={14} className="shrink-0 text-muted-2" />
                </button>
              );
            })}
          </div>
        )}
      </Panel>
      )}

      {selected && <AttendanceRecorder clientId={clientId} session={selected} athletes={athletes} seedAttendance={seedAttendance} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Pill({ n, c, label }: { n: number; c: string; label: string }) {
  return <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums" style={{ color: c, backgroundColor: `${c}15` }}>{n}<span className="opacity-60">{label}</span></span>;
}
function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${active ? "border-transparent text-white" : "border-border text-muted hover:text-foreground"}`} style={active ? { backgroundColor: color ?? "var(--brand-primary)" } : undefined}>
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />}{label}
    </button>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-[13px] text-muted">{children}</div>;
}
