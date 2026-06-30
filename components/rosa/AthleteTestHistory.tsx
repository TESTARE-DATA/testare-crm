"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AthleteTestSession } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useDbCollection } from "@/lib/useDbCollection";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

function percColor(p: number | null): string {
  if (p == null) return "var(--muted-2)";
  if (p >= 67) return "var(--good)";
  if (p >= 34) return "var(--warn)";
  return "var(--bad)";
}

/**
 * Storico delle valutazioni neuromuscolari dell'atleta — alimentato dai report
 * importati nella sezione Test (collezione athlete-tests:<clientId>). Mostra ogni
 * sessione datata con i suoi test, valore e percentile.
 */
export function AthleteTestHistory({ clientId, athleteId, initial }: { clientId: string; athleteId: string; initial?: AthleteTestSession[] }) {
  const { items } = useDbCollection<AthleteTestSession>(`athlete-tests:${clientId}`, initial);
  const sessions = useMemo(
    () => items.filter((s) => s.athleteId === athleteId).sort((a, b) => b.date.localeCompare(a.date)),
    [items, athleteId],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  // La più recente è espansa di default.
  const currentId = sessions[0]?.id ?? null;
  const isOpen = (id: string) => (openId ? openId === id : id === currentId);

  return (
    <Panel
      title="Storico valutazioni neuromuscolari"
      className="brand-topline"
      action={<Link href={sectionHref(clientId, "test")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Test <Icon name="chevron" size={13} /></Link>}
    >
      {sessions.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted">
          <Icon name="upload" size={18} className="text-muted-2" />
          Nessuna valutazione importata. Carica un report nella sezione <Link href={sectionHref(clientId, "test")} className="brand-text mx-1 font-semibold hover:underline">Test</Link> e i dati di questo atleta compariranno qui.
        </div>
      ) : (
        <ol className="relative space-y-3 p-5">
          <span className="pointer-events-none absolute bottom-6 left-[26px] top-6 w-px bg-border" />
          {sessions.map((s, i) => {
            const open = isOpen(s.id);
            return (
              <li key={s.id} className="relative flex gap-3 pl-1">
                <span className={`relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${i === 0 ? "brand-bg brand-on" : "bg-background text-muted-2"}`}>
                  <Icon name="stopwatch" size={15} />
                </span>
                <div className="flex-1 rounded-xl border border-border bg-surface">
                  <button onClick={() => setOpenId(open ? "__none__" : s.id)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold capitalize">{fmtDate(s.date)}</span>
                      {i === 0 && <span className="brand-soft-bg brand-text rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">ultima</span>}
                    </span>
                    <span className="flex items-center gap-2 text-[12px] text-muted">
                      {s.measures.length} test
                      <Icon name="chevron" size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                    </span>
                  </button>
                  {open && (
                    <div className="grid gap-x-4 gap-y-1.5 border-t border-border px-3.5 py-3 sm:grid-cols-2">
                      {s.measures.map((m) => (
                        <div key={m.name} className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="min-w-0 truncate text-muted">{m.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-mono font-semibold">{m.value}<span className="ml-0.5 text-[11px] font-normal text-muted-2">{m.unit}</span></span>
                            {m.percentile != null && (
                              <span className="inline-flex h-5 min-w-[34px] items-center justify-center rounded-md px-1 text-[11px] font-bold text-white" style={{ backgroundColor: percColor(m.percentile) }}>{m.percentile}°</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
