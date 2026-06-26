"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Athlete, CalendarEvent, WorkAssignment } from "@/lib/types";
import { SESSION_META } from "@/lib/sessions";
import { buildSessions } from "@/lib/attendance";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { Badge } from "@/components/ui";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

/** Prossimi impegni: eventi seed + eventi e sedute create dall'utente (calendario). */
export function UpcomingSessions({ clientId, seedEvents, athletes, today }: { clientId: string; seedEvents: CalendarEvent[]; athletes: Athlete[]; today: string }) {
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);

  const upcoming = useMemo(() => buildSessions(athletes, [...seedEvents, ...localEvents], assignments)
    .filter((s) => s.date >= today && s.sessionType !== "riposo")
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 6), [athletes, seedEvents, localEvents, assignments, today]);

  if (upcoming.length === 0) return <p className="px-4 py-6 text-sm text-muted">Nessun impegno in programma.</p>;

  return (
    <ul className="divide-y divide-border">
      {upcoming.map((s) => {
        const meta = SESSION_META[s.sessionType];
        const isAsg = s.source === "assignment";
        return (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{s.title}</div>
              <div className="truncate text-[12px] text-muted">
                {fmtDate(s.date)}{s.slot ? ` · ${s.slot}` : ""}{s.time ? ` ${s.time}` : ""}
                {isAsg ? ` · assegnato a ${s.rosterIds.length}` : s.location ? ` · ${s.location}` : ""}
                {s.objective ? ` · 🎯 ${s.objective}` : ""}
              </div>
            </div>
            <Badge tone={s.sessionType === "partita" ? "red" : isAsg ? "brand" : "default"}>{meta.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
