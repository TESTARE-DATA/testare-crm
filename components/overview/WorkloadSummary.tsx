"use client";

import Link from "next/link";
import type { CalendarEvent } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/overview/CountUp";

const CAMPO = "var(--brand-primary)";
const PALESTRA = "#7c3aed";
const PARTITA = "var(--warn)";

/**
 * Lavoro svolto "di sempre": tutte le sedute completate dal primo giorno di
 * allenamento (≤ oggi). Allenamenti in campo, in palestra e partite disputate,
 * con la ripartizione campo/palestra del volume di lavoro.
 */
export function WorkloadSummary({ clientId, events, today }: { clientId: string; events: CalendarEvent[]; today: string }) {
  const training = events
    .filter((e) => (e.sessionType === "campo" || e.sessionType === "palestra") && e.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const campo = training.filter((e) => e.sessionType === "campo").length;
  const palestra = training.filter((e) => e.sessionType === "palestra").length;
  const totalTraining = campo + palestra;
  const matches = events.filter((e) => e.sessionType === "partita" && e.date <= today).length;

  const firstDate = training[0]?.date;
  const since = firstDate
    ? new Date(firstDate + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const campoPct = totalTraining ? Math.round((campo / totalTraining) * 100) : 0;

  const cal = sectionHref(clientId, "calendario");

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      {/* Riepilogo "di sempre" */}
      <div className="hero-mesh relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          <Icon name="load" size={14} className="brand-text" /> Sedute totali
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-extrabold tracking-tight"><CountUp value={totalTraining} /></span>
          <span className="mb-1.5 text-[13px] text-muted">allenamenti</span>
        </div>
        <div className="mt-1 text-[12px] text-muted">dal <b className="text-foreground">{since}</b></div>

        {/* Ripartizione campo / palestra */}
        <div className="mt-4">
          <div className="grow-right flex h-2.5 w-full overflow-hidden rounded-full bg-background">
            {campo > 0 && <div style={{ width: `${campoPct}%`, backgroundColor: CAMPO }} />}
            {palestra > 0 && <div style={{ width: `${100 - campoPct}%`, backgroundColor: PALESTRA }} />}
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CAMPO }} /><b className="tnum">{campoPct}%</b> <span className="text-muted">campo</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PALESTRA }} /><b className="tnum">{100 - campoPct}%</b> <span className="text-muted">palestra</span></span>
          </div>
        </div>
      </div>

      {/* Dettaglio per tipo di seduta */}
      <div className="grid gap-3 sm:grid-cols-3">
        <WorkTile href={cal} icon="pitch" color={CAMPO} label="In campo" value={campo} sub={`${totalTraining ? Math.round((campo / totalTraining) * 100) : 0}% del lavoro`} />
        <WorkTile href={cal} icon="dumbbell" color={PALESTRA} label="In palestra" value={palestra} sub={`${totalTraining ? Math.round((palestra / totalTraining) * 100) : 0}% del lavoro`} />
        <WorkTile href={sectionHref(clientId, "campionato")} icon="trophy" color={PARTITA} label="Partite" value={matches} sub="disputate" />
      </div>
    </div>
  );
}

function WorkTile({ href, icon, color, label, value, sub }: { href: string; icon: string; color: string; label: string; value: number; sub: string }) {
  return (
    <Link href={href} className="lift spotlight group/tile flex flex-col rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover/tile:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          <Icon name={icon} size={18} />
        </span>
        <Icon name="chevron" size={14} className="text-muted-2 transition-transform duration-200 group-hover/tile:translate-x-0.5" />
      </div>
      <div className="mt-3 text-4xl font-extrabold tracking-tight"><CountUp value={value} /></div>
      <div className="mt-0.5 text-[12px] font-medium text-muted">{label}</div>
      <div className="text-[11px] text-muted-2">{sub}</div>
    </Link>
  );
}
