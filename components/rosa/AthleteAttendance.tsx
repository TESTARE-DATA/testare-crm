"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Athlete, CalendarEvent, SessionType, WorkAssignment } from "@/lib/types";
import { type AttendanceRec, PRESENCE_LOAD_FACTOR, bucketOf, buildSessions, useAttendance } from "@/lib/attendance";
import { SESSION_META } from "@/lib/sessions";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

const REF_TODAY = "2026-06-19";

/** Scheda presenze dell'atleta nel suo profilo Rosa — alimentata dal registro. */
export function AthleteAttendance({ clientId, athleteId, athletes, seedEvents, seedAttendance }: {
  clientId: string; athleteId: string; athletes: Athlete[]; seedEvents: CalendarEvent[]; seedAttendance: AttendanceRec[];
}) {
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { merged: attendance } = useAttendance(clientId, seedAttendance);

  const data = useMemo(() => {
    const att = new Map(attendance.map((r) => [r.id, r]));
    const recIds = new Set(attendance.filter((r) => Object.keys(r.entries).length > 0).map((r) => r.id));
    const sessions = buildSessions(athletes, [...seedEvents, ...localEvents], assignments)
      .filter((s) => s.sessionType !== "riposo" && s.rosterIds.includes(athleteId) && (s.date <= REF_TODAY || recIds.has(s.id)));

    let present = 0, partial = 0, absent = 0, minutes = 0, plannedLoad = 0, actualLoad = 0;
    const byTypeMap = new Map<SessionType, number>(); // presenze (presente+diff) per tipo
    for (const s of sessions) {
      const e = att.get(s.id)?.entries[athleteId];
      const b = bucketOf(s.sessionType, e?.status);
      if (!b) continue;
      if (b === "present") present++;
      else if (b === "partial") partial++;
      else absent++;
      if (e?.minutes) minutes += e.minutes;
      plannedLoad += s.estLoad;
      actualLoad += s.estLoad * PRESENCE_LOAD_FACTOR[b];
      if (b !== "absent") byTypeMap.set(s.sessionType, (byTypeMap.get(s.sessionType) ?? 0) + 1); // presenza
    }
    const recorded = present + partial + absent;
    const attended = present + partial; // presenze totali
    const rate = recorded ? Math.round((present / recorded) * 100) : 0;
    const byType = [...byTypeMap.entries()]
      .map(([type, count]) => ({ type, count, pct: attended ? Math.round((count / attended) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
    return { recorded, present, partial, absent, minutes, rate, attended, byType, plannedLoad: Math.round(plannedLoad), actualLoad: Math.round(actualLoad), loadAdherence: plannedLoad ? Math.round((actualLoad / plannedLoad) * 100) : 0 };
  }, [athletes, seedEvents, localEvents, assignments, attendance, athleteId]);

  const tone = data.rate >= 85 ? "#16a34a" : data.rate >= 70 ? "#d97706" : "#dc2626";

  return (
    <Panel
      title="Presenze · registro"
      action={<Link href={sectionHref(clientId, "registro-attivita/presenze")} className="brand-text text-[13px] font-semibold hover:underline">Registro →</Link>}
    >
      {data.recorded === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">Nessuna presenza registrata per questo atleta.</p>
      ) : (
        <div className="grid gap-6 p-5 sm:grid-cols-[200px_1fr]">
          {/* % presenza */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-background py-4">
            <div className="text-4xl font-bold tabular-nums" style={{ color: tone }}>{data.rate}%</div>
            <div className="text-[12px] text-muted">presenza · {data.recorded} sedute</div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
              <Chip n={data.present} c="#16a34a" label="presente" />
              <Chip n={data.partial} c="#d97706" label="diff." />
              <Chip n={data.absent} c="#dc2626" label="assente" />
            </div>
            {data.minutes > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted"><Icon name="stopwatch" size={13} /> {data.minutes}′ giocati</div>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted" title="Carico assorbito vs assegnato"><Icon name="load" size={13} /> <b className="text-foreground">{data.actualLoad}</b>/{data.plannedLoad} AU · {data.loadAdherence}%</div>
          </div>

          {/* presenze per tipo di seduta (% sul totale presenze) */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Presenze per tipo di seduta</div>
            {data.byType.length === 0 ? (
              <p className="text-[13px] text-muted">Nessuna presenza registrata.</p>
            ) : (
              <div className="space-y-2">
                {data.byType.map((t) => {
                  const meta = SESSION_META[t.type];
                  return (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 w-32 shrink-0 text-[13px] font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: meta.color }} /></div>
                      <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-muted"><b className="text-foreground">{t.pct}%</b> · {t.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Chip({ n, c, label }: { n: number; c: string; label: string }) {
  return <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold tabular-nums" style={{ color: c, backgroundColor: `${c}15` }}>{n}<span className="opacity-70">{label}</span></span>;
}
