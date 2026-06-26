"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Measurement } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

const CAT_COLOR: Record<string, string> = {
  Antropometria: "#0891b2", Velocità: "#dc2626", Potenza: "#7c3aed", Forza: "#d97706",
  Mobilità: "#16a34a", Core: "#2563eb", Fisiologia: "#db2777",
};
const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });

/** Misurazioni interne dell'atleta (collegate a Data Analysis → Misurazioni). */
export function AthleteMeasurements({ clientId, athleteId, seed }: { clientId: string; athleteId: string; seed: Measurement[] }) {
  const { items: local } = useLocalCollection<Measurement>(`misurazioni:${clientId}`);
  const list = useMemo(
    () => [...seed, ...local.filter((m) => m.athleteId === athleteId)].sort((a, b) => b.date.localeCompare(a.date)),
    [seed, local, athleteId],
  );

  return (
    <Panel
      title="Misurazioni interne"
      action={<Link href={sectionHref(clientId, "test/misurazioni")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Misurazioni <Icon name="chevron" size={13} /></Link>}
    >
      {list.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Nessuna misurazione registrata per questo atleta.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.slice(0, 8).map((m) => {
            const color = CAT_COLOR[m.category] ?? "var(--muted-2)";
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{m.type}</div>
                  <div className="truncate text-[11px] text-muted">{m.category} · {fmt(m.date)}{m.recordedBy ? ` · ${m.recordedBy}` : ""}</div>
                </div>
                <div className="shrink-0 font-mono text-sm font-bold tnum">{m.value}<span className="ml-0.5 text-[11px] font-medium text-muted-2">{m.unit}</span></div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
