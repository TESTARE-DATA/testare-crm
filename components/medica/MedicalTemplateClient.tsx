"use client";

import { useMemo, useState } from "react";
import type { InjuryPhase, RehabItem, RehabTemplate } from "@/lib/types";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";

const PHASES: InjuryPhase[] = ["acuta", "subacuta", "riatletizzazione", "return to play"];
const PHASE_COLOR: Record<string, string> = { acuta: "#dc2626", subacuta: "#ea580c", riatletizzazione: "#d97706", "return to play": "#16a34a", conclusa: "#64748b" };

export function MedicalTemplateClient({ clientId, seedTemplates, items, seedCount }: { clientId: string; seedTemplates: RehabTemplate[]; items: RehabItem[]; seedCount: number }) {
  const { items: local, add, remove } = useDbCollection<RehabTemplate>(`medical-templates:${clientId}`);
  const [open, setOpen] = useState(false);
  const localIds = new Set(local.map((t) => t.id));
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const all = useMemo(() => [...seedTemplates, ...local], [seedTemplates, local]);

  return (
    <div className="mx-auto max-w-[1200px] fade-up">
      <MedHeader
        clientId={clientId}
        seedCount={seedCount}
        section="Protocolli"
        title="Template riabilitativi"
        subtitle="Protocolli per fase con dosaggio, durata e criteri di uscita"
        icon="layers"
        actions={<button onClick={() => setOpen(true)} className="med-accent-bg flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"><Icon name="plus" size={16} /> Nuovo protocollo</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PHASES.map((ph) => (
          <StatCard key={ph} label={ph} value={all.filter((t) => t.phase === ph).length} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {all.map((t) => {
          const color = PHASE_COLOR[t.phase];
          const tot = t.itemIds.reduce((s, id) => s + (itemMap.get(id)?.durationMin ?? 0), 0);
          return (
            <div key={t.id} className="card group flex flex-col overflow-hidden p-0" style={{ borderTopWidth: 3, borderTopColor: color }}>
              <div className="flex items-start justify-between gap-2 px-4 pt-4">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color }}>Protocollo · {t.phase}</div>
                  <h3 className="mt-0.5 text-lg font-bold leading-tight">{t.name}</h3>
                  <div className="mt-0.5 text-[12px] text-muted">{t.goal}</div>
                </div>
                {localIds.has(t.id) && <button onClick={() => remove(t.id)} title="Elimina" className="text-muted-2 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">✕</button>}
              </div>

              {/* Parametri protocollo */}
              <div className="mx-4 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                <Param label="Durata" value={t.durationWeeks ? `${t.durationWeeks} sett` : "—"} />
                <Param label="Frequenza" value={t.frequency ?? "—"} />
                <Param label="Volume" value={`${tot}′`} />
              </div>

              <div className="mt-3 flex-1 space-y-1.5 px-4">
                {t.itemIds.map((id) => {
                  const it = itemMap.get(id);
                  if (!it) return null;
                  const ic = it.kind === "trattamento" ? "var(--med)" : "var(--good)";
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5 text-[13px]">
                      <Icon name={it.kind === "trattamento" ? "medical" : "dumbbell"} size={13} style={{ color: ic }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                      {it.dosage && <span className="font-mono text-[11px] font-semibold text-muted">{it.dosage}</span>}
                      <span className="text-[11px] text-muted-2">{it.durationMin}′</span>
                    </div>
                  );
                })}
              </div>

              {t.criteria && (
                <div className="mx-4 mt-3 rounded-lg med-soft-bg p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide med-accent"><Icon name="target" size={11} /> Criteri di uscita</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-foreground/80">{t.criteria}</div>
                </div>
              )}
              {t.notes && <div className="mx-4 mb-4 mt-2.5 text-[12px] text-muted"><span className="font-medium text-foreground/70">Note: </span>{t.notes}</div>}
              {!t.notes && <div className="pb-4" />}
            </div>
          );
        })}
      </div>

      {open && <AddTemplateModal clientId={clientId} items={items} onClose={() => setOpen(false)} onAdd={add} />}
    </div>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-2.5 py-1.5 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="font-mono text-[12px] font-semibold">{value}</div>
    </div>
  );
}

function AddTemplateModal({ clientId, items, onClose, onAdd }: { clientId: string; items: RehabItem[]; onClose: () => void; onAdd: (t: RehabTemplate) => void }) {
  const [form, setForm] = useState({ name: "", phase: "riatletizzazione" as InjuryPhase, goal: "", area: "", notes: "", durationWeeks: 2, frequency: "", criteria: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function submit() {
    if (!form.name.trim() || selected.length === 0) return;
    onAdd({ id: newId(`${clientId}-rht`), clientId, name: form.name, phase: form.phase, goal: form.goal || "—", area: form.area || "Generale", itemIds: selected, notes: form.notes || undefined, durationWeeks: form.durationWeeks || undefined, frequency: form.frequency || undefined, criteria: form.criteria || undefined });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Nuovo protocollo riabilitativo" onClose={onClose} accent="var(--med)" />
      <div className="overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" full><input className="inp" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="es. Riatletizzazione flessori" /></Field>
          <Field label="Fase"><select className="inp" value={form.phase} onChange={(e) => set("phase", e.target.value as InjuryPhase)}>{PHASES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Distretto / area"><input className="inp" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="es. Catena posteriore" /></Field>
          <Field label="Durata (settimane)"><input type="number" min={0} className="inp" value={form.durationWeeks} onChange={(e) => set("durationWeeks", Math.max(0, +e.target.value))} /></Field>
          <Field label="Frequenza"><input className="inp" value={form.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="es. 5×/sett" /></Field>
          <Field label="Obiettivo" full><input className="inp" value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="es. Forza eccentrica e gesto sport-specifico" /></Field>
          <Field label="Criteri di uscita" full><input className="inp" value={form.criteria} onChange={(e) => set("criteria", e.target.value)} placeholder="es. LSI forza ≥ 90%, corsa indolore" /></Field>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-[12px] font-medium text-muted">Voci del protocollo <span className="text-muted-2">({selected.length} selezionate)</span></div>
          <div className="grid max-h-60 gap-1.5 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-2">
            {items.map((it) => {
              const on = selected.includes(it.id);
              const ic = it.kind === "trattamento" ? "var(--elite)" : "var(--good)";
              return (
                <button key={it.id} onClick={() => toggle(it.id)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition-colors ${on ? "brand-border bg-brand-soft" : "border-border hover:bg-background"}`}>
                  <Icon name={it.kind === "trattamento" ? "medical" : "dumbbell"} size={13} style={{ color: ic }} />
                  <span className="flex-1 truncate font-medium">{it.name}</span>
                  {on && <Icon name="plus" size={13} className="brand-text rotate-45" />}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Note" full><textarea className="mt-3 inp min-h-[56px] resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} disabled={!form.name.trim() || selected.length === 0} className="med-accent-bg rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salva protocollo</button>
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
