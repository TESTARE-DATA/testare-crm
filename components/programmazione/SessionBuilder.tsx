"use client";

import { useId } from "react";
import type { Exercise, ExerciseDomain, ExercisePrescription, SessionCircuit, SessionMedia } from "@/lib/types";
import { newId } from "@/lib/store";
import { fileToDataUrl } from "@/lib/usePhotos";
import { Icon } from "@/components/Icon";
import type { AssignExOpt } from "./AssignButton";

// ---- Modello del builder (ordinato) -----------------------------------------
export interface BuildBlock {
  uid: string;
  exerciseId?: string; // collegato a un esercizio di libreria (se il nome combacia)
  name: string;
  domain: ExerciseDomain;
  sets: string;
  reps: string;
  rest: string;
  intensity: string;
  rpe: string;
  note: string;
  media: SessionMedia[];
}
export type BuildItem =
  | { kind: "single"; block: BuildBlock }
  | { kind: "circuit"; uid: string; rounds: string; rest: string; blocks: BuildBlock[] };

let seq = 0;
const uid = () => `b${Date.now().toString(36)}${seq++}`;
export const newBlock = (domain: ExerciseDomain): BuildBlock => ({ uid: uid(), name: "", domain, sets: "3", reps: "10", rest: "90", intensity: "", rpe: "", note: "", media: [] });
export const newSingle = (domain: ExerciseDomain): BuildItem => ({ kind: "single", block: newBlock(domain) });
export const newCircuit = (domain: ExerciseDomain): BuildItem => ({ kind: "circuit", uid: uid(), rounds: "3", rest: "120", blocks: [newBlock(domain)] });

export const itemBlocks = (items: BuildItem[]): BuildBlock[] => items.flatMap((it) => (it.kind === "single" ? [it.block] : it.blocks));
export const hasContent = (items: BuildItem[]) => itemBlocks(items).some((b) => b.name.trim());

/** Ricostruisce gli item del builder da una prescrizione salvata (per "parti da template"). */
export function prescriptionToItems(prescription: ExercisePrescription[], circuits: SessionCircuit[], domain: ExerciseDomain): BuildItem[] {
  const items: BuildItem[] = [];
  const circuitMap = new Map<string, Extract<BuildItem, { kind: "circuit" }>>();
  for (const p of prescription) {
    const b: BuildBlock = { uid: uid(), exerciseId: p.exerciseId, name: p.name, domain, sets: p.sets != null ? String(p.sets) : "", reps: p.reps ?? "", rest: p.restSec != null ? String(p.restSec) : "", intensity: p.intensity ?? "", rpe: p.rpe != null ? String(p.rpe) : "", note: p.note ?? "", media: p.media ?? [] };
    if (p.circuitId) {
      let ci = circuitMap.get(p.circuitId);
      if (!ci) { const c = circuits.find((x) => x.id === p.circuitId); ci = { kind: "circuit", uid: p.circuitId, rounds: String(c?.rounds ?? 3), rest: String(c?.restSec ?? 120), blocks: [] }; circuitMap.set(p.circuitId, ci); items.push(ci); }
      ci.blocks.push(b);
    } else {
      items.push({ kind: "single", block: b });
    }
  }
  return items;
}

/** Trasforma il contenuto del builder in prescrizione + circuiti, creando gli
 *  esercizi non ancora in libreria. Ritorna anche durata/RPE stimati. */
export function buildContent(items: BuildItem[], clientId: string, library: AssignExOpt[]): {
  prescription: ExercisePrescription[]; circuits: SessionCircuit[]; newExercises: Exercise[]; durationMin: number; avgRpe: number;
} {
  const byName = new Map(library.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const newExercises: Exercise[] = [];
  const prescription: ExercisePrescription[] = [];
  const circuits: SessionCircuit[] = [];
  const rpes: number[] = [];

  const resolve = (b: BuildBlock): string => {
    if (b.exerciseId) return b.exerciseId;
    const existing = byName.get(b.name.trim().toLowerCase());
    if (existing) return existing;
    const ex: Exercise = { id: newId(`${clientId}-ex`), clientId, name: b.name.trim(), domain: b.domain, category: b.domain === "tattico" ? "Possesso" : "Forza", description: "", durationMin: 15, equipment: [], tags: [] };
    newExercises.push(ex);
    byName.set(ex.name.toLowerCase(), ex.id);
    return ex.id;
  };
  const toPres = (b: BuildBlock, circuitId?: string): ExercisePrescription => {
    if (b.rpe) rpes.push(+b.rpe);
    return {
      exerciseId: resolve(b), name: b.name.trim(),
      sets: b.sets ? +b.sets : undefined, reps: b.reps || undefined,
      restSec: b.rest ? +b.rest : undefined, intensity: b.intensity || undefined,
      rpe: b.rpe ? +b.rpe : undefined, note: b.note || undefined,
      media: b.media.length ? b.media : undefined, circuitId,
    };
  };

  for (const it of items) {
    if (it.kind === "single") {
      if (!it.block.name.trim()) continue;
      prescription.push(toPres(it.block));
    } else {
      const blocks = it.blocks.filter((b) => b.name.trim());
      if (!blocks.length) continue;
      circuits.push({ id: it.uid, rounds: +it.rounds || 1, restSec: +it.rest || 0 });
      for (const b of blocks) prescription.push(toPres(b, it.uid));
    }
  }
  const avgRpe = rpes.length ? Math.round(rpes.reduce((s, n) => s + n, 0) / rpes.length) : 6;
  const durationMin = Math.max(20, prescription.length * 8);
  return { prescription, circuits, newExercises, durationMin, avgRpe };
}

// ---- UI ---------------------------------------------------------------------
export function SessionBuilder({ items, setItems, library, suggestions, defaultDomain }: {
  items: BuildItem[]; setItems: (fn: (prev: BuildItem[]) => BuildItem[]) => void; library: AssignExOpt[]; suggestions?: AssignExOpt[]; defaultDomain: ExerciseDomain;
}) {
  const listId = useId().replace(/:/g, "");
  const datalist = suggestions ?? library; // esercizi suggeriti (scremati per tipo seduta)

  const patchBlock = (itemIdx: number, blockUid: string, patch: Partial<BuildBlock>) =>
    setItems((prev) => prev.map((it, i) => {
      if (i !== itemIdx) return it;
      if (it.kind === "single") return { ...it, block: { ...it.block, ...patch } };
      return { ...it, blocks: it.blocks.map((b) => (b.uid === blockUid ? { ...b, ...patch } : b)) };
    }));
  const patchCircuit = (itemIdx: number, patch: { rounds?: string; rest?: string }) =>
    setItems((prev) => prev.map((it, i) => (i === itemIdx && it.kind === "circuit" ? { ...it, ...patch } : it)));
  const removeItem = (itemIdx: number) => setItems((prev) => prev.filter((_, i) => i !== itemIdx));
  const removeBlock = (itemIdx: number, blockUid: string) =>
    setItems((prev) => prev.flatMap((it, i) => {
      if (i !== itemIdx || it.kind !== "circuit") return [it];
      const blocks = it.blocks.filter((b) => b.uid !== blockUid);
      return blocks.length ? [{ ...it, blocks }] : [];
    }));
  const addToCircuit = (itemIdx: number) =>
    setItems((prev) => prev.map((it, i) => (i === itemIdx && it.kind === "circuit" ? { ...it, blocks: [...it.blocks, newBlock(defaultDomain)] } : it)));

  // Aggancio nome → esercizio di libreria.
  const onName = (itemIdx: number, b: BuildBlock, name: string) => {
    const match = library.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase());
    patchBlock(itemIdx, b.uid, { name, exerciseId: match?.id, domain: match ? match.domain : b.domain });
  };

  const block = (b: BuildBlock, itemIdx: number, removable: boolean) => (
    <div key={b.uid} className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <input list={listId} className="inp flex-1" placeholder="Nome esercizio" value={b.name} onChange={(e) => onName(itemIdx, b, e.target.value)} />
        {b.exerciseId ? <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700" title="Già in libreria">in libreria</span> : b.name.trim() ? <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title="Verrà creato in libreria">nuovo</span> : null}
        {removable && <button type="button" onClick={() => removeBlock(itemIdx, b.uid)} className="shrink-0 rounded p-1 text-muted hover:text-red-600" title="Rimuovi">✕</button>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <PField label="Serie"><input className="pinp" value={b.sets} onChange={(e) => patchBlock(itemIdx, b.uid, { sets: e.target.value })} /></PField>
        <PField label="Reps / tempo"><input className="pinp" value={b.reps} onChange={(e) => patchBlock(itemIdx, b.uid, { reps: e.target.value })} placeholder="10 · 30s" /></PField>
        <PField label="Rec. (s)"><input className="pinp" value={b.rest} onChange={(e) => patchBlock(itemIdx, b.uid, { rest: e.target.value })} /></PField>
        <PField label="Intensità"><input className="pinp" value={b.intensity} onChange={(e) => patchBlock(itemIdx, b.uid, { intensity: e.target.value })} placeholder="70% · 20kg" /></PField>
        <PField label="RPE target"><input className="pinp" value={b.rpe} onChange={(e) => patchBlock(itemIdx, b.uid, { rpe: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })} placeholder="1-10" /></PField>
      </div>
      <input className="inp mt-2 text-[13px]" value={b.note} onChange={(e) => patchBlock(itemIdx, b.uid, { note: e.target.value })} placeholder="Note / indicazioni…" />
      <MediaRow media={b.media} onChange={(media) => patchBlock(itemIdx, b.uid, { media })} />
    </div>
  );

  return (
    <div className="space-y-3">
      <datalist id={listId}>{datalist.map((e) => <option key={e.id} value={e.name} />)}</datalist>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-muted">Aggiungi il primo esercizio o un circuito per comporre la sessione.</div>
      )}

      {items.map((it, i) => it.kind === "single" ? (
        block(it.block, i, false) // il "single" si rimuove dal cestino in alto a destra del blocco? no: aggiungo bottone qui
      ) : (
        <div key={it.uid} className="rounded-xl border-2 border-dashed border-[var(--brand-primary)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide brand-text"><Icon name="trend" size={14} /> Circuito</span>
            <div className="flex items-center gap-2 text-[13px]">
              <label className="flex items-center gap-1.5"><span className="text-muted">Giri</span><input className="pinp w-14" value={it.rounds} onChange={(e) => patchCircuit(i, { rounds: e.target.value.replace(/\D/g, "") })} /></label>
              <label className="flex items-center gap-1.5"><span className="text-muted">Rec. giri (s)</span><input className="pinp w-16" value={it.rest} onChange={(e) => patchCircuit(i, { rest: e.target.value.replace(/\D/g, "") })} /></label>
              <button type="button" onClick={() => removeItem(i)} className="rounded p-1 text-muted hover:text-red-600" title="Rimuovi circuito">✕</button>
            </div>
          </div>
          <div className="space-y-2">{it.blocks.map((b) => block(b, i, it.blocks.length > 1))}</div>
          <button type="button" onClick={() => addToCircuit(i)} className="mt-2 w-full rounded-lg border border-dashed border-border py-1.5 text-[12px] font-medium text-muted-2 hover:border-[var(--brand-primary)] hover:text-foreground">+ Esercizio nel circuito</button>
        </div>
      ))}

      {/* per i blocchi single: cestino */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setItems((prev) => [...prev, newSingle(defaultDomain)])} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-semibold hover:border-[var(--brand-primary)]"><Icon name="plus" size={14} /> Aggiungi esercizio</button>
        <button type="button" onClick={() => setItems((prev) => [...prev, newCircuit(defaultDomain)])} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-semibold hover:border-[var(--brand-primary)]"><Icon name="trend" size={14} /> Aggiungi circuito</button>
      </div>
    </div>
  );
}

function MediaRow({ media, onChange }: { media: SessionMedia[]; onChange: (m: SessionMedia[]) => void }) {
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    onChange([...media, { kind: "image", url }]);
    e.target.value = "";
  };
  const onVideo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = (e.target as HTMLInputElement).value.trim();
    if (!v) return;
    onChange([...media, { kind: "video", url: v }]);
    (e.target as HTMLInputElement).value = "";
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {media.map((m, i) => (
        <span key={i} className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-medium">
          {m.kind === "image" ? <img src={m.url} alt="" className="h-6 w-6 rounded object-cover" /> : <><Icon name="live" size={12} /> video</>}
          <button type="button" onClick={() => onChange(media.filter((_, j) => j !== i))} className="text-muted hover:text-red-600">✕</button>
        </span>
      ))}
      <label className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground">
        <Icon name="upload" size={12} /> Immagine<input type="file" accept="image/*" hidden onChange={onFile} />
      </label>
      <input className="pinp h-auto flex-1 py-1 text-[12px]" placeholder="Incolla URL video + Invio" onKeyDown={onVideo} />
    </div>
  );
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-center text-[10px] font-medium uppercase tracking-wide text-muted-2">{label}</span>{children}</label>;
}
