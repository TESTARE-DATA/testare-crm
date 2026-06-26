"use client";

import { useMemo, useState } from "react";
import type { InjurySeverity, MedicalRecord } from "@/lib/types";
import { Icon } from "@/components/Icon";

const SEVERITY_COLOR: Record<InjurySeverity, string> = {
  lieve: "var(--elite)",
  moderato: "var(--warn)",
  grave: "var(--bad)",
};
const MONTHS = ["lug", "ago", "set", "ott", "nov", "dic", "gen", "feb", "mar", "apr", "mag", "giu"];

interface Bar { m: MedicalRecord; lane: number; left: number; width: number; color: string; clippedStart: boolean; clippedEnd: boolean }

/**
 * Timeline infortuni su finestra stagionale (lug–giu, 12 mesi) con navigazione
 * alle stagioni passate. Ogni episodio è una barra posizionata per data e
 * durata, colorata per gravità, su corsie che evitano le sovrapposizioni.
 */
export function InjuryTimeline({ records, today }: { records: MedicalRecord[]; today: string }) {
  // Anno d'inizio della stagione corrente (lug→giu).
  const now = new Date(today + "T00:00:00Z");
  const curStartYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const [offset, setOffset] = useState(0); // 0 = stagione corrente, 1 = precedente, ...

  const startYear = curStartYear - offset;
  const winStart = `${startYear}-07-01`;
  const winEnd = `${startYear + 1}-06-30`;
  const startMs = Date.parse(winStart);
  const endMs = Date.parse(winEnd);
  const span = endMs - startMs;
  const label = `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;

  const { bars, lanes } = useMemo(() => {
    const pct = (iso: string) => ((Date.parse(iso) - startMs) / span) * 100;
    const inWindow = records
      .map((m) => ({ m, s: m.date, e: m.returnedAt ?? m.expectedReturn ?? today }))
      .filter((x) => Date.parse(x.s) <= endMs && Date.parse(x.e) >= startMs)
      .sort((a, b) => a.s.localeCompare(b.s));

    const laneEnds: number[] = [];
    const out: Bar[] = [];
    for (const x of inWindow) {
      const left = Math.max(0, pct(x.s));
      const right = Math.min(100, pct(x.e));
      const width = Math.max(1.5, right - left);
      let lane = laneEnds.findIndex((end) => end <= left - 0.5);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = left + width;
      out.push({
        m: x.m, lane, left, width,
        color: x.m.severity ? SEVERITY_COLOR[x.m.severity] : "var(--muted-2)",
        clippedStart: Date.parse(x.s) < startMs,
        clippedEnd: Date.parse(x.e) > endMs,
      });
    }
    return { bars: out, lanes: Math.max(1, laneEnds.length) };
  }, [records, startMs, endMs, span, today]);

  const todayPct = today >= winStart && today <= winEnd ? ((Date.parse(today) - startMs) / span) * 100 : null;
  const trackH = lanes * 30;

  return (
    <div className="border-b border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Timeline infortuni</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-[12px] font-bold">Stagione {label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset((o) => o + 1)} className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[12px] font-semibold text-muted transition-colors hover:bg-background hover:text-foreground" title="Stagione precedente">
            <Icon name="arrowLeft" size={13} /> Precedente
          </button>
          <button onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[12px] font-semibold text-muted transition-colors enabled:hover:bg-background enabled:hover:text-foreground disabled:opacity-40" title="Stagione successiva">
            Successiva <Icon name="chevron" size={13} />
          </button>
        </div>
      </div>

      {/* Etichette mesi */}
      <div className="relative ml-0 flex text-[10px] text-muted-2">
        {MONTHS.map((mo, i) => (
          <div key={mo} className="flex-1 border-l border-border pl-1" style={i === 0 ? { borderLeftColor: "transparent" } : undefined}>{mo}</div>
        ))}
      </div>

      {/* Track */}
      <div className="relative mt-1 rounded-xl bg-background" style={{ height: trackH + 12 }}>
        {/* gridlines mesi */}
        {MONTHS.map((_, i) => i > 0 && (
          <span key={i} className="absolute top-0 h-full w-px bg-border/70" style={{ left: `${(i / 12) * 100}%` }} />
        ))}
        {/* marker oggi */}
        {todayPct != null && (
          <span className="absolute top-0 z-[2] h-full w-0.5 bg-brand" style={{ left: `${todayPct}%`, backgroundColor: "var(--brand-primary)" }} title="Oggi">
            <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: "var(--brand-primary)" }} />
          </span>
        )}

        {bars.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted">Nessun infortunio in questa stagione.</div>
        ) : (
          bars.map((b) => (
            <div
              key={b.m.id}
              className="absolute z-[1] flex items-center overflow-hidden rounded-md px-1.5 text-[10px] font-semibold text-white shadow-sm"
              style={{
                left: `${b.left}%`,
                width: `${b.width}%`,
                top: 6 + b.lane * 30,
                height: 24,
                backgroundColor: b.color,
                borderTopLeftRadius: b.clippedStart ? 0 : undefined,
                borderBottomLeftRadius: b.clippedStart ? 0 : undefined,
                borderTopRightRadius: b.clippedEnd ? 0 : undefined,
                borderBottomRightRadius: b.clippedEnd ? 0 : undefined,
              }}
              title={`${b.m.injury} · ${b.m.bodyPart}${b.m.daysOut != null ? ` · ${b.m.daysOut} gg` : ""}`}
            >
              <span className="truncate">{b.m.injury}</span>
            </div>
          ))
        )}
      </div>

      {/* Legenda gravità */}
      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <Legend color={SEVERITY_COLOR.lieve} label="Lieve" />
        <Legend color={SEVERITY_COLOR.moderato} label="Moderato" />
        <Legend color={SEVERITY_COLOR.grave} label="Grave" />
        <span className="ml-auto text-muted-2">finestra 12 mesi · lug–giu</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} /> {label}</span>;
}
