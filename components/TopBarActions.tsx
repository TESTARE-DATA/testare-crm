"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, MedicalRecord } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { Avatar } from "@/components/Avatar";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  infortunato: { label: "Infortunato", color: "var(--bad)" },
  "in recupero": { label: "In recupero", color: "var(--warn)" },
};

/** Azioni reali della top bar: ricerca rapida sulla rosa e centro notifiche
 *  (alert clinici derivati da rosa + Area Medica — "tutto si parla"). */
export function TopBarActions({ clientId, athletes, medical }: { clientId: string; athletes: Athlete[]; medical: MedicalRecord[] }) {
  const [search, setSearch] = useState(false);
  const [notif, setNotif] = useState(false);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = [...athletes].sort((a, b) => a.shirtNumber - b.shirtNumber);
    if (!ql) return list.slice(0, 8);
    return list.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(ql) ||
      a.role.toLowerCase().includes(ql) ||
      String(a.shirtNumber) === ql,
    );
  }, [q, athletes]);

  const alerts = useMemo(() => {
    const open = new Map<string, MedicalRecord>();
    for (const m of medical) {
      if (m.phase === "conclusa") continue;
      const cur = open.get(m.athleteId);
      if (!cur || m.date > cur.date) open.set(m.athleteId, m);
    }
    return athletes
      .filter((a) => a.status === "infortunato" || a.status === "in recupero")
      .map((a) => ({ a, m: open.get(a.id) }))
      .sort((x, y) => (x.a.status === "infortunato" ? 0 : 1) - (y.a.status === "infortunato" ? 0 : 1));
  }, [athletes, medical]);

  return (
    <>
      <button onClick={() => setSearch(true)} className="rounded-lg p-2 transition-colors hover:bg-background" aria-label="Cerca atleta"><Icon name="search" size={18} /></button>

      <div className="relative">
        <button onClick={() => setNotif((v) => !v)} className="relative rounded-lg p-2 transition-colors hover:bg-background" aria-label="Notifiche" aria-expanded={notif}>
          <Icon name="bell" size={18} />
          {alerts.length > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ backgroundColor: "var(--bad)" }}>{alerts.length}</span>
          )}
        </button>
        {notif && (
          <>
            <button className="fixed inset-0 z-30 cursor-default" aria-label="Chiudi notifiche" onClick={() => setNotif(false)} />
            <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-sm font-bold">Notifiche</span>
                <span className="text-[11px] text-muted-2">{alerts.length} alert</span>
              </div>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted"><Icon name="sparkle" size={16} className="text-good" /> Nessun alert clinico. Rosa al completo.</div>
              ) : (
                <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                  {alerts.map(({ a, m }) => {
                    const st = STATUS_LABEL[a.status] ?? { label: a.status, color: "var(--muted-2)" };
                    return (
                      <li key={a.id}>
                        <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} onClick={() => setNotif(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-background">
                          <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} shirtNumber={a.shirtNumber} size={34} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></div>
                            <div className="truncate text-[11px] text-muted">{m?.injury ?? a.role}</div>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold" style={{ color: st.color }}>{st.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href={sectionHref(clientId, "area-medica")} onClick={() => setNotif(false)} className="brand-text block border-t border-border px-4 py-2.5 text-center text-[12px] font-semibold hover:bg-background">Apri Area Medica →</Link>
            </div>
          </>
        )}
      </div>

      {search && (
        <Modal onClose={() => setSearch(false)} size="md">
          <ModalHeader title="Cerca atleta" subtitle="Nome, ruolo o numero di maglia" onClose={() => setSearch(false)} />
          <div className="shrink-0 border-b border-border px-6 py-3">
            <input className="inp" placeholder="Cerca nella rosa…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Nessun atleta trovato.</p>
            ) : (
              results.map((a) => (
                <Link key={a.id} href={`${sectionHref(clientId, "rosa")}/${a.id}`} onClick={() => setSearch(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-background">
                  <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} shirtNumber={a.shirtNumber} size={36} />
                  <span className="flex-1 truncate text-sm font-medium">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></span>
                  <span className="text-[12px] text-muted-2">{a.role} · #{a.shirtNumber}</span>
                </Link>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
