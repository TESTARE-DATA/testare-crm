"use client";

import { useMemo, useState } from "react";
import type { Athlete } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";

const ROLES = ["Portiere", "Difensore", "Centrocampista", "Attaccante"] as const;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, "");

/** Selettore di un atleta DALLA ROSA esistente (non crea nuovi atleti). */
export function AthletePicker({
  athletes,
  photos,
  title = "Seleziona atleta dalla rosa",
  subtitle,
  onPick,
  onClose,
}: {
  athletes: Athlete[];
  photos: Record<string, string>;
  title?: string;
  subtitle?: string;
  onPick: (a: Athlete) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const query = norm(q);
    const filtered = athletes.filter((a) => !query || norm(`${a.firstName} ${a.lastName} ${a.shirtNumber}`).includes(query));
    return ROLES.map((role) => ({ role, list: filtered.filter((a) => a.role === role).sort((x, y) => x.shirtNumber - y.shirtNumber) })).filter((g) => g.list.length > 0);
  }, [athletes, q]);

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} accent="var(--med)" />
      <div className="flex flex-col overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Icon name="search" size={15} className="text-muted-2" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o numero…" className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Nessun atleta trovato.</p>
          ) : (
            groups.map((g) => (
              <div key={g.role} className="mb-4 last:mb-0">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-2">{g.role}</div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {g.list.map((a) => (
                    <button key={a.id} onClick={() => onPick(a)} className="flex items-center gap-2.5 rounded-xl border border-border p-2 text-left transition-colors hover:med-soft-bg hover:border-[color-mix(in_srgb,var(--med)_35%,transparent)]">
                      <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{a.firstName} {a.lastName}</div>
                        <div className="truncate text-[11px] text-muted">#{a.shirtNumber} · {a.status}</div>
                      </div>
                      <Icon name="chevron" size={15} className="text-muted-2" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
