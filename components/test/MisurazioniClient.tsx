"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, Measurement, StaffMember } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection, newId } from "@/lib/store";
import { useRoster } from "@/lib/useRoster";
import { usePhotos } from "@/lib/usePhotos";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { PageHeader, StatCard } from "@/components/ui";

const CAT_COLOR: Record<string, string> = {
  Antropometria: "#0891b2",
  Velocità: "#dc2626",
  Potenza: "#7c3aed",
  Forza: "#d97706",
  Mobilità: "#16a34a",
  Core: "#2563eb",
  Fisiologia: "#db2777",
};
const catColor = (c: string) => CAT_COLOR[c] ?? "var(--muted-2)";

interface Tpl { type: string; unit: string; category: string }
const TEMPLATES: Tpl[] = [
  { type: "Peso", unit: "kg", category: "Antropometria" },
  { type: "Massa grassa", unit: "%", category: "Antropometria" },
  { type: "Plicometria", unit: "mm", category: "Antropometria" },
  { type: "Sprint 10m", unit: "s", category: "Velocità" },
  { type: "Sprint 30m", unit: "s", category: "Velocità" },
  { type: "CMJ", unit: "cm", category: "Potenza" },
  { type: "Squat Jump", unit: "cm", category: "Potenza" },
  { type: "Sit & Reach", unit: "cm", category: "Mobilità" },
  { type: "Plank", unit: "s", category: "Core" },
  { type: "FC a riposo", unit: "bpm", category: "Fisiologia" },
];

const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });

export function MisurazioniClient({ clientId, seedAthletes, seedMeasurements, staff }: { clientId: string; seedAthletes: Athlete[]; seedMeasurements: Measurement[]; staff: StaffMember[] }) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: local, add, remove } = useLocalCollection<Measurement>(`misurazioni:${clientId}`);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string>("Tutte");
  const localIds = new Set(local.map((m) => m.id));

  const ath = (id: string) => athletes.find((a) => a.id === id);
  const all = useMemo(() => [...seedMeasurements, ...local].sort((a, b) => b.date.localeCompare(a.date)), [seedMeasurements, local]);
  const categories = useMemo(() => [...new Set(all.map((m) => m.category))].sort(), [all]);
  const list = all.filter((m) => cat === "Tutte" || m.category === cat);

  const byDay = useMemo(() => {
    const map = new Map<string, Measurement[]>();
    for (const m of list) { if (!map.has(m.date)) map.set(m.date, []); map.get(m.date)!.push(m); }
    return [...map.entries()];
  }, [list]);

  const atletiMisurati = new Set(all.map((m) => m.athleteId)).size;

  return (
    <div className="mx-auto max-w-[1000px] fade-up">
      <Link href={sectionHref(clientId, "test")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <Icon name="arrowLeft" size={15} /> Test e misura
      </Link>
      <PageHeader
        title="Misurazioni interne"
        subtitle="Misure e test rapidi rilevati dallo staff durante la stagione"
        icon="clipboard"
        actions={<button onClick={() => setOpen(true)} className="brand-bg brand-on flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"><Icon name="plus" size={16} /> Nuova misurazione</button>}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Rilevazioni" value={all.length} tone="brand" icon="clipboard" />
        <StatCard label="Atleti misurati" value={atletiMisurati} icon="users" />
        <StatCard label="Tipi di misura" value={new Set(all.map((m) => m.type)).size} tone="good" icon="layers" />
      </div>

      {all.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">Nessuna misurazione registrata. Aggiungine una con “Nuova misurazione”.</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {["Tutte", ...categories].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${cat === c ? "brand-bg brand-on border-transparent" : "border-border text-muted hover:text-foreground"}`}>{c}</button>
            ))}
          </div>

          <div className="space-y-5">
            {byDay.map(([date, items]) => (
              <div key={date}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-2 capitalize">{fmt(date)}</div>
                <div className="space-y-2">
                  {items.map((m) => {
                    const a = ath(m.athleteId);
                    const color = catColor(m.category);
                    return (
                      <div key={m.id} className="card group flex items-center gap-3 p-3.5">
                        {a && <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} size={40} />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold">{a ? `${a.firstName} ${a.lastName}` : "—"}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>{m.category}</span>
                          </div>
                          <div className="truncate text-[13px] text-muted">{m.type}{m.recordedBy ? ` · ${m.recordedBy}` : ""}{m.notes ? ` · ${m.notes}` : ""}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-extrabold leading-none tnum">{m.value}<span className="ml-0.5 text-[12px] font-medium text-muted-2">{m.unit}</span></div>
                        </div>
                        {localIds.has(m.id) && <button onClick={() => remove(m.id)} title="Elimina" className="text-muted-2 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">✕</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {open && <AddModal clientId={clientId} athletes={athletes} staff={staff} onClose={() => setOpen(false)} onAdd={add} />}
    </div>
  );
}

function AddModal({ clientId, athletes, staff, onClose, onAdd }: { clientId: string; athletes: Athlete[]; staff: StaffMember[]; onClose: () => void; onAdd: (m: Measurement) => void }) {
  const [form, setForm] = useState({ athleteId: athletes[0]?.id ?? "", date: new Date().toISOString().slice(0, 10), category: "Antropometria", type: "", value: "", unit: "", recordedBy: "", notes: "" });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function applyTpl(t: Tpl) { setForm((f) => ({ ...f, type: t.type, unit: t.unit, category: t.category })); }

  function submit() {
    if (!form.athleteId || !form.type.trim() || form.value === "") return;
    onAdd({ id: newId(`${clientId}-meas`), clientId, athleteId: form.athleteId, date: form.date, category: form.category || "Generale", type: form.type, value: Number(form.value), unit: form.unit, recordedBy: form.recordedBy || undefined, notes: form.notes || undefined });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title="Nuova misurazione" subtitle="Rilevazione interna dello staff" onClose={onClose} />
      <div className="overflow-y-auto p-6">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">Misure rapide</div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button key={t.type} onClick={() => applyTpl(t)} className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${form.type === t.type ? "brand-border brand-text bg-brand-soft" : "border-border text-muted hover:bg-background hover:text-foreground"}`}>{t.type}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Atleta" full>
            <select className="inp" value={form.athleteId} onChange={(e) => set("athleteId", e.target.value)}>{athletes.map((a) => <option key={a.id} value={a.id}>{a.shirtNumber} · {a.firstName} {a.lastName}</option>)}</select>
          </Field>
          <Field label="Tipo di misura"><input className="inp" value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="es. Sprint 10m" /></Field>
          <Field label="Categoria">
            <select className="inp" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {["Antropometria", "Velocità", "Potenza", "Forza", "Mobilità", "Core", "Fisiologia", "Generale"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Valore"><input type="number" step="any" className="inp" value={form.value} onChange={(e) => set("value", e.target.value)} /></Field>
          <Field label="Unità"><input className="inp" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg, s, cm…" /></Field>
          <Field label="Data"><input type="date" className="inp" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Rilevato da">
            <select className="inp" value={form.recordedBy} onChange={(e) => set("recordedBy", e.target.value)}>
              <option value="">— non indicato —</option>
              {staff.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.role}</option>)}
            </select>
          </Field>
          <Field label="Note" full><input className="inp" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="condizioni, strumento…" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} disabled={!form.type.trim() || form.value === ""} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">Salva misurazione</button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
