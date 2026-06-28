"use client";

import { useMemo, useState } from "react";
import type { Athlete, Exercise, ExerciseDomain, TacticalCategory, AthleticCategory } from "@/lib/types";
import { useLocalCollection } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { Badge, PageHeader } from "@/components/ui";
import { AssignButton } from "@/components/programmazione/AssignButton";

const ATH_RPE: Record<string, number> = { Forza: 7, Potenza: 7, Sprint: 8, Rapidità: 6, Pliometria: 7, Prevenzione: 4, Core: 4, Mobilità: 3 };
const estRpeFor = (e: Exercise) => (e.domain === "tattico" ? 7 : ATH_RPE[e.category] ?? 6);

const TACTICAL_CATS: TacticalCategory[] = ["Possesso", "Finalizzazione", "Transizioni", "Situazionale", "Riscaldamento tecnico", "Partita a tema"];
const ATHLETIC_CATS: AthleticCategory[] = ["Forza", "Potenza", "Sprint", "Rapidità", "Pliometria", "Prevenzione", "Core", "Mobilità"];

/** Libreria esercizi filtrata per dominio, con modifica ed eliminazione. */
export function EserciziClient({ clientId, seed, domain, athletes, defaultDate }: { clientId: string; seed: Exercise[]; domain: ExerciseDomain; athletes: Athlete[]; defaultDate?: string }) {
  const created = useLocalCollection<Exercise>(`drills:${clientId}`);
  const overrides = useLocalCollection<Exercise>(`ex-overrides:${clientId}`);
  const hidden = useLocalCollection<{ id: string }>(`ex-hidden:${clientId}`);
  const isTactical = domain === "tattico";

  const hiddenIds = new Set(hidden.items.map((h) => h.id));
  const overrideMap = new Map(overrides.items.map((o) => [o.id, o]));
  const createdIds = new Set(created.items.map((c) => c.id));
  const seedIds = new Set(seed.map((s) => s.id));

  const all = useMemo(() => {
    const base = [...created.items, ...seed]
      .filter((e) => e.domain === domain && !hiddenIds.has(e.id))
      .map((e) => overrideMap.get(e.id) ?? e);
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created.items, overrides.items, hidden.items, seed, domain]);

  const categories = useMemo(() => [...new Set(all.map((e) => e.category))], [all]);
  const [cat, setCat] = useState<string>("Tutti");
  const list = cat === "Tutti" ? all : all.filter((e) => e.category === cat);

  const [editing, setEditing] = useState<Exercise | null>(null);

  const onDelete = (e: Exercise) => {
    if (createdIds.has(e.id)) created.remove(e.id);
    else hidden.add({ id: e.id });
  };
  const onSave = (e: Exercise) => {
    if (createdIds.has(e.id)) { created.remove(e.id); created.add(e); } // modifica esercizio creato
    else if (seedIds.has(e.id)) { overrides.remove(e.id); overrides.add(e); } // override su seed
    else { created.add(e); } // nuovo esercizio
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader
        title={isTactical ? "Esercitazioni" : "Esercizi"}
        subtitle={isTactical ? "Esercizi tattici di campo — collegati a Campo Live e ai template" : "Esercizi di preparazione atletica per la palestra"}
        icon={isTactical ? "pitch" : "dumbbell"}
        actions={<button onClick={() => setEditing(blankExercise(clientId, domain))} className="brand-bg brand-on rounded-xl px-4 py-2 text-sm font-semibold shadow-sm">+ Esercizio</button>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {["Tutti", ...categories].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${cat === c ? "brand-bg brand-on" : "border border-border bg-surface text-muted hover:text-foreground"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => (
          <div key={e.id} className="card card-hover group relative flex flex-col p-4">
            {/* azioni */}
            <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => setEditing(e)} className="rounded-lg border border-border bg-surface p-1.5 text-muted hover:text-foreground" title="Modifica"><Icon name="layers" size={14} /></button>
              <button onClick={() => onDelete(e)} className="rounded-lg border border-border bg-surface p-1.5 text-muted hover:border-red-200 hover:text-red-600" title="Elimina"><Icon name="medical" size={14} /></button>
            </div>

            <div className="flex items-start justify-between gap-2 pr-16">
              <h3 className="text-sm font-bold">{e.name}</h3>
            </div>
            <Badge tone="brand">{e.category}</Badge>
            <p className="mt-2 flex-1 text-[13px] leading-snug text-muted">{e.description}</p>

            {e.drill && (() => {
              const d = e.drill;
              const b = d.playersB ?? d.playersPerTeam;
              const nvn = `${d.playersPerTeam}v${b}${d.jollyCount ? `+${d.jollyCount}` : ""}${d.goalkeepers ? "+P" : ""}`;
              return (
                <div className="brand-soft-bg mt-3 rounded-xl p-2 text-[11px]">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <DrillStat v={`${d.pitchLengthM}×${d.pitchWidthM}`} l="metri" />
                    <DrillStat v={nvn} l={d.playersPerTeam !== b ? "⚡ superiorità" : "in parità"} />
                    <DrillStat v={`${d.densityM2}m²`} l="densità" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] pt-1.5 text-[10.5px] text-muted">
                    <span>int. <b className="text-foreground">{d.intensity}</b></span>
                    <span>· {d.series}×{d.reps}</span>
                    <span>· rec {d.recoverySec}″</span>
                    {d.rules.length > 0 && <span>· {d.rules.length} regole</span>}
                    {d.variants.length > 0 && <span>· {d.variants.length} varianti</span>}
                  </div>
                </div>
              );
            })()}

            {e.muscleGroups && e.muscleGroups.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.muscleGroups.map((m) => <span key={m} className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/70">{m}</span>)}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[12px] text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Icon name="stopwatch" size={14} /> {e.durationMin}′</span>
                {e.players && <span className="flex items-center gap-1"><Icon name="users" size={14} /> {e.players}</span>}
              </span>
              <AssignButton clientId={clientId} athletes={athletes} defaultDate={defaultDate} target={{ kind: "esercizio", refId: e.id, refName: e.name, domain: e.domain, durationMin: e.durationMin, estRpe: estRpeFor(e), items: [{ exerciseId: e.id, name: e.name, durationMin: e.durationMin }] }} />
            </div>
          </div>
        ))}
      </div>

      {editing && <EditModal domain={domain} exercise={editing} onClose={() => setEditing(null)} onSave={onSave} />}
    </div>
  );
}

function EditModal({ domain, exercise, onClose, onSave }: { domain: ExerciseDomain; exercise: Exercise; onClose: () => void; onSave: (e: Exercise) => void }) {
  const cats = domain === "tattico" ? TACTICAL_CATS : ATHLETIC_CATS;
  const [f, setF] = useState({ name: exercise.name, category: exercise.category as string, description: exercise.description, durationMin: exercise.durationMin, players: exercise.players ?? "", equipment: exercise.equipment.join(", ") });
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...exercise, name: f.name.trim(), category: f.category as Exercise["category"], description: f.description, durationMin: +f.durationMin, players: f.players || undefined, equipment: f.equipment.split(",").map((s) => s.trim()).filter(Boolean) });
  };
  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={exercise.name ? "Modifica esercizio" : "Nuovo esercizio"} onClose={onClose} />
      <div className="space-y-3 overflow-y-auto p-6">
        <Lbl t="Nome"><input className="inp" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Lbl>
        <Lbl t="Categoria"><select className="inp" value={f.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Lbl>
        <Lbl t="Descrizione"><textarea className="inp" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Lbl>
        <div className="grid grid-cols-2 gap-3">
          <Lbl t="Durata (min)"><input type="number" className="inp" value={f.durationMin} onChange={(e) => set("durationMin", +e.target.value)} /></Lbl>
          <Lbl t="Giocatori"><input className="inp" value={f.players} onChange={(e) => set("players", e.target.value)} placeholder="es. 8 vs 8" /></Lbl>
        </div>
        <Lbl t="Materiale (separato da virgola)"><input className="inp" value={f.equipment} onChange={(e) => set("equipment", e.target.value)} /></Lbl>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
        <button onClick={save} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Salva</button>
      </div>
    </Modal>
  );
}

function blankExercise(clientId: string, domain: ExerciseDomain): Exercise {
  return {
    id: `${clientId}-ex-new-${Math.abs(Date.now() % 1e9).toString(36)}`,
    clientId, name: "", domain,
    category: domain === "tattico" ? "Possesso" : "Forza",
    description: "", durationMin: 12, equipment: [], tags: [],
  };
}

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">{t}</span>{children}</label>;
}
function DrillStat({ v, l }: { v: string; l: string }) {
  return <div><div className="brand-text font-bold">{v}</div><div className="text-muted">{l}</div></div>;
}
