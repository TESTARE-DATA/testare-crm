"use client";

import Link from "next/link";
import { useState } from "react";
import type { Athlete } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { kpiFlags, type KpiFlag } from "@/lib/squad-insights";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";

interface AlertItem { athlete: Athlete; flags: KpiFlag[] }

/**
 * Atleti in alert (≥2 flag sul profilo fisico). Ogni riga è cliccabile e apre
 * il dettaglio dei flag con scorciatoia alla scheda atleta.
 */
export function AlertAthletes({
  clientId,
  athletes,
  photos,
  readiness,
}: {
  clientId: string;
  athletes: Athlete[];
  photos: Record<string, string>;
  readiness: Record<string, number>;
}) {
  const [open, setOpen] = useState<AlertItem | null>(null);

  const items: AlertItem[] = athletes
    .map((a) => ({ athlete: a, flags: kpiFlags(a.profile) }))
    .filter((x) => x.flags.length >= 2)
    .sort((a, b) => b.flags.length - a.flags.length);

  return (
    <>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted">
          <Icon name="sparkle" size={18} className="text-good" /> Nessun atleta in alert.
        </div>
      ) : (
        <ul className="stagger divide-y divide-border">
          {items.map(({ athlete: a, flags }) => {
            const rd = readiness[a.id];
            return (
              <li key={a.id}>
                <button
                  onClick={() => setOpen({ athlete: a, flags })}
                  className="group/al relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background"
                >
                  <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-amber-400 transition-transform duration-200 group-hover/al:scale-y-100" />
                  <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} size={32} />
                  <div className="min-w-0 flex-1 transition-transform duration-200 group-hover/al:translate-x-0.5">
                    <div className="truncate text-sm font-semibold">{a.firstName} {a.lastName}</div>
                    <div className="truncate text-[11px] text-muted">{a.role}{rd != null ? <> · readiness <span className="tnum">{rd}</span></> : ""}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-bold text-amber-700 transition-transform duration-200 group-hover/al:scale-105">
                    <Icon name="medical" size={12} /> <span className="tnum">{flags.length}</span>
                  </span>
                  <Icon name="chevron" size={16} className="text-muted-2 transition-transform duration-200 group-hover/al:translate-x-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)} size="md">
          <ModalHeader
            title={`${open.athlete.firstName} ${open.athlete.lastName}`}
            subtitle={`${open.athlete.role} · ${open.flags.length} flag attivi`}
            onClose={() => setOpen(null)}
          />
          <div className="overflow-y-auto p-6">
            <div className="mb-4 flex items-center gap-3">
              <Avatar firstName={open.athlete.firstName} lastName={open.athlete.lastName} photoUrl={photos[open.athlete.id] ?? open.athlete.photoUrl} size={52} />
              <div className="flex flex-wrap gap-3 text-[13px]">
                {(["forza", "potenza", "reattivita", "simmetria"] as const).map((k) => (
                  <span key={k}>
                    <span className="text-muted capitalize">{k}</span>{" "}
                    <b style={{ color: open.athlete.profile[k] < (k === "simmetria" ? 70 : 50) ? "var(--bad)" : "var(--foreground)" }}>
                      {open.athlete.profile[k]}
                    </b>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {open.flags.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Icon name="medical" size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <div className="text-sm font-semibold text-amber-800">{f.label}</div>
                    <div className="text-[12px] text-amber-700/90">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Chiudi</button>
              <Link
                href={`${sectionHref(clientId, "rosa")}/${open.athlete.id}`}
                className="brand-bg brand-on flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
              >
                <Icon name="users" size={15} /> Apri scheda atleta
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
