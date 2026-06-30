"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Athlete, CalendarEvent, MedicalClosure, MedicalRecord, SessionType, WorkAssignment } from "@/lib/types";
import { buildSessions } from "@/lib/attendance";
import { SESSION_META } from "@/lib/sessions";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { effectivePhase, type MedicalPhaseOverride } from "@/lib/medical-flow";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

const REF_TODAY = "2026-06-19";
const HORIZON_DAYS = 21;

interface AgendaItem {
  id: string;
  date: string;
  time?: string;
  sessionType: SessionType;
  kind: "seduta" | "rientro";
  title: string;
  objective?: string;
  location?: string;
  load?: number;
}

/**
 * Agenda dell'atleta: i prossimi impegni in cui è coinvolto (sedute di squadra
 * o di gruppo, partite, lavori assegnati) più i rientri clinici previsti.
 * Orizzonte: prossimi 21 giorni, raggruppati per giornata.
 */
export function AthleteAgenda({
  clientId,
  athleteId,
  athletes,
  seedEvents,
  seedMedical,
  initialMedical,
  initialClosures,
  initialPhase,
}: {
  clientId: string;
  athleteId: string;
  athletes: Athlete[];
  seedEvents: CalendarEvent[];
  seedMedical: MedicalRecord[];
  initialMedical?: MedicalRecord[];
  initialClosures?: MedicalClosure[];
  initialPhase?: MedicalPhaseOverride[];
}) {
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { items: localMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`, initialMedical);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`, initialClosures);
  const { items: phaseOv } = useDbCollection<MedicalPhaseOverride>(`medical-phase:${clientId}`, initialPhase);

  const items = useMemo(() => {
    const horizon = isoPlus(REF_TODAY, HORIZON_DAYS);
    const sessions = buildSessions(athletes, [...seedEvents, ...localEvents], assignments)
      .filter((s) => s.date >= REF_TODAY && s.date <= horizon && s.rosterIds.includes(athleteId));

    const list: AgendaItem[] = sessions.map((s) => ({
      id: s.id, date: s.date, time: s.time, sessionType: s.sessionType, kind: "seduta",
      title: s.title, objective: s.objective, location: s.location, load: s.estLoad,
    }));

    // Rientri clinici previsti (episodi attivi dell'atleta): fase effettiva dal
    // Diario e casi chiusi esclusi, coerentemente con l'Area Medica.
    const closedIds = new Set(closures.map((c) => c.id));
    for (const m of [...seedMedical, ...localMedical]) {
      if (m.athleteId !== athleteId || !m.expectedReturn) continue;
      const phase = closedIds.has(m.id) ? "conclusa" : effectivePhase(m, phaseOv);
      if (phase === "conclusa") continue;
      if (m.expectedReturn < REF_TODAY || m.expectedReturn > horizon) continue;
      list.push({ id: `ret-${m.id}`, date: m.expectedReturn, sessionType: "medico", kind: "rientro", title: `Rientro previsto · ${m.injury}`, location: "Area medica" });
    }

    list.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

    // Raggruppa per giorno.
    const byDay = new Map<string, AgendaItem[]>();
    for (const it of list) {
      if (!byDay.has(it.date)) byDay.set(it.date, []);
      byDay.get(it.date)!.push(it);
    }
    return [...byDay.entries()].map(([date, its]) => ({ date, items: its }));
  }, [athletes, seedEvents, localEvents, assignments, seedMedical, localMedical, closures, phaseOv, athleteId]);

  const totalSessions = items.reduce((s, d) => s + d.items.filter((i) => i.kind === "seduta").length, 0);

  return (
    <Panel
      title="Agenda atleta"
      className="brand-topline"
      action={<Link href={sectionHref(clientId, "calendario")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Calendario <Icon name="chevron" size={13} /></Link>}
    >
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">Nessun impegno in programma nei prossimi {HORIZON_DAYS} giorni.</p>
      ) : (
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2 text-[12px] text-muted">
            <Icon name="calendar" size={14} className="brand-text" />
            <b className="text-foreground tnum">{totalSessions}</b> impegni nei prossimi {HORIZON_DAYS} giorni
          </div>
          <div className="space-y-4">
            {items.map(({ date, items: its }) => (
              <DayRow key={date} date={date} items={its} />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function DayRow({ date, items }: { date: string; items: AgendaItem[] }) {
  const d = new Date(date + "T00:00:00Z");
  const isToday = date === REF_TODAY;
  const weekday = d.toLocaleDateString("it-IT", { weekday: "short", timeZone: "UTC" });
  const dayNum = d.getUTCDate();
  const month = d.toLocaleDateString("it-IT", { month: "short", timeZone: "UTC" });

  return (
    <div className="flex gap-3.5">
      {/* Chip giorno */}
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${isToday ? "brand-bg brand-on border-transparent" : "border-border bg-background"}`}>
        <span className={`text-[10px] font-semibold uppercase ${isToday ? "opacity-90" : "text-muted-2"}`}>{weekday}</span>
        <span className="text-xl font-extrabold leading-none tnum">{dayNum}</span>
        <span className={`text-[9px] uppercase ${isToday ? "opacity-90" : "text-muted-2"}`}>{month}</span>
      </div>

      {/* Sedute della giornata */}
      <div className="min-w-0 flex-1 space-y-2">
        {isToday && <div className="text-[10px] font-bold uppercase tracking-wide brand-text">Oggi</div>}
        {items.map((it) => <AgendaCard key={it.id} item={it} />)}
      </div>
    </div>
  );
}

function AgendaCard({ item }: { item: AgendaItem }) {
  const meta = SESSION_META[item.sessionType];
  const isReturn = item.kind === "rientro";
  return (
    <div className="lift flex items-center gap-3 rounded-xl border border-border bg-surface p-3" style={isReturn ? { borderStyle: "dashed" } : undefined}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}>
        <Icon name={meta.icon} size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.title}</div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted">
          <span className="font-medium" style={{ color: meta.color }}>{meta.label}</span>
          {item.objective && <span className="truncate">{item.objective}</span>}
          {item.location && <span className="flex items-center gap-1"><Icon name="pitch" size={11} /> {item.location}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {item.time && <div className="text-[13px] font-bold tnum">{item.time}</div>}
        {item.load != null && !isReturn && <div className="text-[10px] text-muted-2 tnum">{item.load} AU</div>}
      </div>
    </div>
  );
}

function isoPlus(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
