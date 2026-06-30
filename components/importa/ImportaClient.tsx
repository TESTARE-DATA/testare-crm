"use client";

import { useMemo, useRef, useState } from "react";
import type { ImportJob, ImportStatus } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { Badge, Panel, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";

const STATUS_TONE: Record<ImportStatus, "green" | "amber" | "red"> = {
  completato: "green",
  "in corso": "amber",
  errore: "red",
};

type Source = { name: string; desc: string; icon: string; target: string; accept: string };
const SOURCES: Source[] = [
  { name: "GPS / Tracking", desc: "Catapult, STATSports, Polar", icon: "live", target: "Carico", accept: ".csv,.txt,.xlsx" },
  { name: "Test fisici", desc: "ForceDecks, Optojump, cronometri", icon: "stopwatch", target: "Test", accept: ".csv,.txt,.xlsx" },
  { name: "CSV / Excel", desc: "Rosa, anagrafiche, risultati", icon: "upload", target: "Rosa", accept: ".csv,.txt,.xlsx" },
  { name: "Wearable", desc: "Heart rate, sonno, recupero", icon: "load", target: "Carico", accept: ".csv,.txt,.json" },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Sezione "Importa Dati" interattiva: i job creati dall'utente vivono in
 *  localStorage `imports:<clientId>` e si fondono con quelli seed nello storico. */
export function ImportaClient({ clientId, seedJobs }: { clientId: string; seedJobs: ImportJob[] }) {
  const { items, add } = useLocalCollection<ImportJob>(`imports:${clientId}`);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<Source | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const jobs = useMemo(
    () => [...items, ...seedJobs].sort((a, b) => b.date.localeCompare(a.date)),
    [items, seedJobs],
  );

  const pick = (src: Source) => {
    pendingRef.current = src;
    if (fileRef.current) { fileRef.current.accept = src.accept; fileRef.current.click(); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const src = pendingRef.current;
    e.target.value = ""; // permette di re-importare lo stesso file
    if (!file || !src) return;
    // Conteggio righe: per CSV/testo si contano le righe non vuote (meno l'header).
    let rows = 0;
    let status: ImportStatus = "completato";
    try {
      if (/\.(csv|txt|json)$/i.test(file.name)) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rows = Math.max(0, lines.length - (/\.csv$/i.test(file.name) ? 1 : 0));
      }
    } catch {
      status = "errore";
    }
    add({ id: newId(`${clientId}-imp`), clientId, source: `${src.name} · ${file.name}`, target: src.target, date: todayISO(), rows, status });
    setToast(status === "errore" ? `Errore nella lettura di ${file.name}` : `Importazione registrata: ${file.name}${rows ? ` · ${rows} righe` : ""} → ${src.target}`);
    window.setTimeout(() => setToast(null), 4500);
  };

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Job totali" value={jobs.length} icon="upload" />
        <StatCard label="Completati" value={jobs.filter((j) => j.status === "completato").length} tone="good" />
        <StatCard label="In corso" value={jobs.filter((j) => j.status === "in corso").length} tone="warn" />
        <StatCard label="Righe importate" value={jobs.reduce((s, j) => s + j.rows, 0).toLocaleString("it-IT")} tone="brand" />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Nuova importazione</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SOURCES.map((s) => (
          <button key={s.name} onClick={() => pick(s)} className="card flex flex-col items-start gap-2 p-4 text-left transition-shadow hover:shadow-md">
            <span className="brand-soft-bg brand-text flex h-10 w-10 items-center justify-center rounded-lg">
              <Icon name={s.icon} size={20} />
            </span>
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="text-[12px] text-muted">{s.desc}</div>
            <span className="brand-text mt-1 inline-flex items-center gap-1 text-[12px] font-semibold"><Icon name="upload" size={13} /> Carica file</span>
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon name="link" size={16} /> {toast}
        </div>
      )}

      <Panel title="Storico importazioni">
        <ul className="divide-y divide-border">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-3">
              <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon name="upload" size={16} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{j.source}</div>
                <div className="text-[12px] text-muted">→ {j.target} · {j.rows.toLocaleString("it-IT")} righe · {fmt(j.date)}</div>
              </div>
              <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
