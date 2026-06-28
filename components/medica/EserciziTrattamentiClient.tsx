"use client";

import { useMemo, useState } from "react";
import type { RehabItem, RehabKind } from "@/lib/types";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";

const KIND_META: Record<RehabKind, { label: string; color: string; icon: string }> = {
  esercizio: { label: "Esercizio", color: "var(--good)", icon: "dumbbell" },
  trattamento: { label: "Trattamento", color: "var(--med)", icon: "medical" },
  prevenzione: { label: "Prevenzione", color: "#4f46e5", icon: "bolt" },
};

export function EserciziTrattamentiClient({ clientId, seedItems, seedCount }: { clientId: string; seedItems: RehabItem[]; seedCount: number }) {
  const { items: local, add, remove } = useDbCollection<RehabItem>(`medical-items:${clientId}`);
  const [filter, setFilter] = useState<"tutti" | RehabKind>("tutti");
  const [open, setOpen] = useState(false);
  const localIds = new Set(local.map((i) => i.id));

  const all = useMemo(() => [...seedItems, ...local], [seedItems, local]);
  const list = all.filter((i) => filter === "tutti" || i.kind === filter);
  const nEx = all.filter((i) => i.kind === "esercizio").length;
  const nTx = all.filter((i) => i.kind === "trattamento").length;
  const nPrev = all.filter((i) => i.kind === "prevenzione").length;

  return (
    <div className="mx-auto max-w-[1200px] fade-up">
      <MedHeader
        clientId={clientId}
        seedCount={seedCount}
        section="Libreria riabilitativa"
        title="Esercizi e trattamenti"
        subtitle="Protocolli evidence-based con dosaggio, intensità e indicazioni"
        icon="dumbbell"
        actions={<button onClick={() => setOpen(true)} className="med-accent-bg flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"><Icon name="plus" size={16} /> Aggiungi voce</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Voci in libreria" value={all.length} tone="brand" icon="layers" />
        <StatCard label="Esercizi" value={nEx} tone="good" icon="dumbbell" />
        <StatCard label="Trattamenti" value={nTx} tone="default" icon="medical" />
        <StatCard label="Prevenzione" value={nPrev} icon="bolt" />
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
        {(["tutti", "esercizio", "trattamento", "prevenzione"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${filter === f ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {f === "tutti" ? "Tutti" : f === "esercizio" ? "Esercizi" : f === "trattamento" ? "Trattamenti" : "Prevenzione"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((it) => {
          const meta = KIND_META[it.kind];
          return (
            <div key={it.id} className="card group flex flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 7%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${meta.color} 18%, transparent)` }}>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>
                  <Icon name={meta.icon} size={13} /> {meta.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {it.evidence && <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted" title="Livello di evidenza">EVID {it.evidence}</span>}
                  {localIds.has(it.id) && <button onClick={() => remove(it.id)} title="Elimina" className="text-muted-2 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">✕</button>}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-bold leading-tight">{it.name}</h3>
                <div className="mt-0.5 text-[12px] text-muted">{it.area} · {it.durationMin}′</div>

                {(it.dosage || it.intensity) && (
                  <div className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
                    <Spec label="Dosaggio" value={it.dosage} />
                    <Spec label="Intensità" value={it.intensity} />
                  </div>
                )}

                <p className="mt-2.5 flex-1 text-[13px] leading-snug text-foreground/75">{it.description}</p>

                {it.phases && it.phases.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {it.phases.map((ph) => <span key={ph} className="rounded-full med-soft-bg med-accent px-2 py-0.5 text-[10px] font-semibold capitalize">{ph}</span>)}
                  </div>
                )}
                {it.cautions && <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700"><Icon name="medical" size={12} className="mt-0.5 shrink-0" /> {it.cautions}</div>}
                {it.equipment && it.equipment.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {it.equipment.map((e) => <span key={e} className="rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted">{e}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && <AddItemModal clientId={clientId} onClose={() => setOpen(false)} onAdd={add} />}
    </div>
  );
}

function Spec({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-surface px-2.5 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="font-mono text-[12px] font-semibold">{value || "—"}</div>
    </div>
  );
}

function AddItemModal({ clientId, onClose, onAdd }: { clientId: string; onClose: () => void; onAdd: (i: RehabItem) => void }) {
  const [form, setForm] = useState({ name: "", kind: "esercizio" as RehabKind, area: "", description: "", equipment: "", durationMin: 15, dosage: "", intensity: "", evidence: "", cautions: "" });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim()) return;
    onAdd({ id: newId(`${clientId}-rh`), clientId, name: form.name, kind: form.kind, area: form.area || "Generale", description: form.description, durationMin: form.durationMin, equipment: form.equipment ? form.equipment.split(",").map((s) => s.trim()).filter(Boolean) : undefined, dosage: form.dosage || undefined, intensity: form.intensity || undefined, evidence: form.evidence || undefined, cautions: form.cautions || undefined });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title="Nuova voce libreria" onClose={onClose} accent="var(--med)" />
      <div className="overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" full><input className="inp" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="es. Nordic curl assistito" /></Field>
          <Field label="Tipo"><select className="inp" value={form.kind} onChange={(e) => set("kind", e.target.value as RehabKind)}><option value="esercizio">Esercizio</option><option value="trattamento">Trattamento</option><option value="prevenzione">Prevenzione</option></select></Field>
          <Field label="Distretto / area"><input className="inp" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="es. Catena posteriore" /></Field>
          <Field label="Dosaggio"><input className="inp" value={form.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="es. 4×8 ecc." /></Field>
          <Field label="Intensità / parametri"><input className="inp" value={form.intensity} onChange={(e) => set("intensity", e.target.value)} placeholder="es. RPE 7 · 60% 1RM" /></Field>
          <Field label="Evidenza"><input className="inp" value={form.evidence} onChange={(e) => set("evidence", e.target.value)} placeholder="es. 1a" /></Field>
          <Field label="Durata (min)"><input type="number" min={0} className="inp" value={form.durationMin} onChange={(e) => set("durationMin", Math.max(0, +e.target.value))} /></Field>
          <Field label="Descrizione" full><textarea className="inp min-h-[60px] resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Avvertenze"><input className="inp" value={form.cautions} onChange={(e) => set("cautions", e.target.value)} placeholder="es. stop se dolore > 3/10" /></Field>
          <Field label="Attrezzatura (virgole)"><input className="inp" value={form.equipment} onChange={(e) => set("equipment", e.target.value)} placeholder="Tappetino, Elastico" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} disabled={!form.name.trim()} className="med-accent-bg rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salva voce</button>
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
