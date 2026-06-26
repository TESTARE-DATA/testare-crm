"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Athlete, CalendarEvent, WorkAssignment } from "@/lib/types";
import { type AttendanceRec, buildSessions, computeStats } from "@/lib/attendance";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { Panel, StatCard } from "@/components/ui";

const REF_TODAY = "2026-06-19";

/** Carico interno PIANIFICATO (assegnato dal calendario) vs ASSORBITO (pesato dalle
 *  presenze). Complementare al carico misurato GPS/HR. Fonte: stesso motore del registro. */
export function CaricoPlanned({ clientId, athletes, seedEvents, seedAttendance }: {
  clientId: string; athletes: Athlete[]; seedEvents: CalendarEvent[]; seedAttendance: AttendanceRec[];
}) {
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { items: localAtt } = useLocalCollection<AttendanceRec>(`attendance:${clientId}`);

  const attendance = useMemo(() => {
    const ids = new Set(localAtt.map((r) => r.id));
    return [...localAtt, ...seedAttendance.filter((s) => !ids.has(s.id))];
  }, [localAtt, seedAttendance]);

  const stats = useMemo(() => {
    const recIds = new Set(attendance.filter((r) => Object.keys(r.entries).length > 0).map((r) => r.id));
    const done = buildSessions(athletes, [...seedEvents, ...localEvents], assignments)
      .filter((s) => s.sessionType !== "riposo" && (s.date <= REF_TODAY || recIds.has(s.id)));
    return computeStats(done, attendance, athletes);
  }, [athletes, seedEvents, localEvents, assignments, attendance]);

  const athById = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);
  const rows = useMemo(() => stats.perAthlete.filter((s) => s.plannedLoad > 0).sort((a, b) => b.actualLoad - a.actualLoad), [stats.perAthlete]);
  const maxPlanned = Math.max(1, ...rows.map((r) => r.plannedLoad));

  if (rows.length === 0) {
    return (
      <Panel title="Carico pianificato vs assorbito · dal calendario" className="mb-6" action={<span className="text-[11px] text-muted-2">alimentato da calendario e presenze</span>}>
        <p className="px-4 py-6 text-sm text-muted">Nessuna seduta con carico assegnato. Assegna sedute dal <Link href={sectionHref(clientId, "calendario")} className="brand-text font-semibold hover:underline">Calendario</Link> e registra le presenze.</p>
      </Panel>
    );
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Carico pianificato" value={stats.plannedLoad.toLocaleString("it-IT")} hint="AU assegnati · sedute svolte" icon="target" />
        <StatCard label="Carico assorbito" value={stats.actualLoad.toLocaleString("it-IT")} hint="AU pesati dalle presenze" tone="brand" icon="load" />
        <StatCard label="Aderenza" value={`${stats.loadAdherence}%`} hint="assorbito / pianificato" tone={stats.loadAdherence >= 90 ? "good" : stats.loadAdherence >= 75 ? "default" : "warn"} icon="trend" />
        <StatCard label="Presenza media" value={`${stats.avgPresence}%`} hint="squadra · sedute allenanti" icon="users" />
      </div>

      <Panel title="Carico pianificato vs assorbito · per atleta" className="mb-6" action={<span className="text-[11px] text-muted-2">dal calendario + presenze · barra = assorbito su pianificato</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Atleta</th>
                <th className="px-3 py-2.5 font-semibold">Assorbito / Pianificato (AU)</th>
                <th className="px-3 py-2.5 font-semibold">Aderenza</th>
                <th className="px-3 py-2.5 font-semibold">Presenza</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const a = athById.get(s.athleteId);
                if (!a) return null;
                const tone = s.loadAdherence >= 90 ? "var(--good)" : s.loadAdherence >= 75 ? "var(--muted)" : "var(--warn)";
                return (
                  <tr key={s.athleteId} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-2.5"><Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-medium hover:underline">{a.lastName}</Link></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 w-32 overflow-hidden rounded-full bg-background">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-muted-2/30" style={{ width: `${(s.plannedLoad / maxPlanned) * 100}%` }} />
                          <div className="brand-bg absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s.actualLoad / maxPlanned) * 100}%` }} />
                        </div>
                        <span className="font-mono font-semibold">{s.actualLoad.toLocaleString("it-IT")}</span>
                        <span className="font-mono text-muted-2">/ {s.plannedLoad.toLocaleString("it-IT")}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: tone }}>{s.loadAdherence}%</td>
                    <td className="px-3 py-2.5 font-mono text-muted">{s.rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-2">
          Pianificato = AU assegnati dal calendario. Assorbito = AU pesati dalla presenza (presente 100% · differenziato 50% · assente 0%). Complementare al carico <b>misurato</b> via GPS/HR qui sotto.
        </p>
      </Panel>
    </>
  );
}
