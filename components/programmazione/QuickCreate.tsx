"use client";

import { useState } from "react";
import type { AthleticCategory, Exercise, ExerciseDomain, SessionTemplate, SessionType, TacticalCategory, TemplateDomain } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import type { AssignExOpt, AssignTplOpt } from "./AssignButton";

// Obiettivo personalizzato (oltre a quelli preimpostati per tipo).
export interface CustomObjective { id: string; clientId: string; label: string; sessionType: SessionType; acr: string; color: string }
export const CUSTOM_OBJ_COLOR = "#64748b";

const TACTICAL_CATS: TacticalCategory[] = ["Possesso", "Finalizzazione", "Transizioni", "Situazionale", "Riscaldamento tecnico", "Partita a tema"];
const ATHLETIC_CATS: AthleticCategory[] = ["Forza", "Potenza", "Sprint", "Rapidità", "Pliometria", "Prevenzione", "Core", "Mobilità"];

const Shell = ({ title, children, onCancel, onSave, canSave }: { title: string; children: React.ReactNode; onCancel: () => void; onSave: () => void; canSave: boolean }) => (
  <div className="mt-2 rounded-xl border border-dashed border-[var(--brand-primary)] bg-background p-3">
    <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide brand-text">{title}</div>
    <div className="space-y-2">{children}</div>
    <div className="mt-3 flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-surface">Annulla</button>
      <button type="button" onClick={onSave} disabled={!canSave} className="brand-bg brand-on rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40">Crea e usa</button>
    </div>
  </div>
);

const DomainToggle = <T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) => (
  <div className="inline-flex rounded-lg border border-border bg-surface p-1">
    {options.map((o) => (
      <button key={o.v} type="button" onClick={() => onChange(o.v)} className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${value === o.v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>{o.label}</button>
    ))}
  </div>
);

/** Crea un nuovo esercizio (salvato in drills:<clientId>, riusabile in Esercizi). */
export function CreateExerciseForm({ clientId, defaultDomain, onCreated, onCancel }: { clientId: string; defaultDomain: ExerciseDomain; onCreated: (o: AssignExOpt) => void; onCancel: () => void }) {
  const { add } = useLocalCollection<Exercise>(`drills:${clientId}`);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<ExerciseDomain>(defaultDomain);
  const cats = domain === "tattico" ? TACTICAL_CATS : ATHLETIC_CATS;
  const [category, setCategory] = useState<string>(cats[0]);
  const [dur, setDur] = useState("20");
  const changeDomain = (d: ExerciseDomain) => { setDomain(d); setCategory((d === "tattico" ? TACTICAL_CATS : ATHLETIC_CATS)[0]); };

  const save = () => {
    const n = name.trim();
    if (!n) return;
    const ex: Exercise = { id: newId(`${clientId}-ex`), clientId, name: n, domain, category: category as TacticalCategory | AthleticCategory, description: "", durationMin: +dur || 20, equipment: [], tags: [] };
    add(ex);
    onCreated({ id: ex.id, name: ex.name, domain: ex.domain, durationMin: ex.durationMin, category: String(ex.category) });
  };

  return (
    <Shell title="Nuovo esercizio" onCancel={onCancel} onSave={save} canSave={!!name.trim()}>
      <input className="inp" placeholder="Nome esercizio (es. Rondo 4v2)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="flex flex-wrap items-center gap-2">
        <DomainToggle value={domain} options={[{ v: "tattico", label: "Campo" }, { v: "atletico", label: "Palestra" }]} onChange={changeDomain} />
        <select className="inp w-auto flex-1" value={category} onChange={(e) => setCategory(e.target.value)}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[13px] text-muted">Durata<input className="pinp w-16" value={dur} onChange={(e) => setDur(e.target.value.replace(/\D/g, ""))} />′</label>
      </div>
    </Shell>
  );
}

/** Crea un nuovo template (salvato in templates:<clientId>). */
export function CreateTemplateForm({ clientId, defaultDomain, exercises, onCreated, onCancel }: { clientId: string; defaultDomain: TemplateDomain; exercises: AssignExOpt[]; onCreated: (o: AssignTplOpt) => void; onCancel: () => void }) {
  const { add } = useLocalCollection<SessionTemplate>(`templates:${clientId}`);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<TemplateDomain>(defaultDomain);
  const [sel, setSel] = useState<string[]>([]);
  const pool = exercises.filter((e) => (domain === "campo" ? e.domain === "tattico" : e.domain === "atletico"));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const dur = sel.reduce((s, id) => s + (exercises.find((e) => e.id === id)?.durationMin ?? 0), 0);

  const save = () => {
    const n = name.trim();
    if (!n || sel.length === 0) return;
    const durationMin = dur || 45;
    const tpl: SessionTemplate = { id: newId(`${clientId}-tpl`), clientId, name: n, domain, goal: "", exerciseIds: sel, estimated: { durationMin, internalRpe: 6, externalKm: 0, sprints: 0, highIntensityM: 0 } };
    add(tpl);
    onCreated({ id: tpl.id, name: n, domain, durationMin, rpe: 6, items: sel.map((id) => ({ exerciseId: id, name: exercises.find((e) => e.id === id)?.name ?? id, durationMin: exercises.find((e) => e.id === id)?.durationMin })) });
  };

  return (
    <Shell title="Nuovo template" onCancel={onCancel} onSave={save} canSave={!!name.trim() && sel.length > 0}>
      <input className="inp" placeholder="Nome template (es. Forza arti inferiori)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="flex items-center gap-2">
        <DomainToggle value={domain} options={[{ v: "campo", label: "Campo" }, { v: "palestra", label: "Palestra" }]} onChange={(d) => { setDomain(d); setSel([]); }} />
        <span className="text-[12px] text-muted">{sel.length} esercizi · {dur || 0}′</span>
      </div>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface">
        {pool.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-muted">Nessun esercizio {domain === "campo" ? "di campo" : "di palestra"} disponibile. Crea prima un esercizio.</div>
        ) : pool.map((e) => {
          const on = sel.includes(e.id);
          return (
            <button key={e.id} type="button" onClick={() => toggle(e.id)} className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-left text-[13px] last:border-0 ${on ? "brand-soft-bg" : "hover:bg-background"}`}>
              <span className="truncate">{e.name} <span className="text-muted-2">· {e.durationMin}′</span></span>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${on ? "brand-bg border-transparent text-white" : "border-border"}`}>{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/** Crea un obiettivo personalizzato (salvato in custom-objectives:<clientId>). */
export function CreateObjectiveForm({ clientId, sessionType, onCreated, onCancel }: { clientId: string; sessionType: SessionType; onCreated: (label: string) => void; onCancel: () => void }) {
  const { add } = useLocalCollection<CustomObjective>(`custom-objectives:${clientId}`);
  const [label, setLabel] = useState("");
  const save = () => {
    const l = label.trim();
    if (!l) return;
    const acr = (l.split(/\s+/).map((w) => w[0]).join("").slice(0, 3) || "PER").toUpperCase();
    add({ id: newId(`${clientId}-obj`), clientId, label: l, sessionType, acr, color: CUSTOM_OBJ_COLOR });
    onCreated(l);
  };
  return (
    <Shell title="Nuovo obiettivo" onCancel={onCancel} onSave={save} canSave={!!label.trim()}>
      <input className="inp" placeholder="Obiettivo (es. Pressing ultra-offensivo)" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
    </Shell>
  );
}
