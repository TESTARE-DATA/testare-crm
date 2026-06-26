"use client";

import { useEffect, useState } from "react";
import type { ExercisePrescription, WorkAssignment } from "@/lib/types";
import { objectiveMeta } from "@/lib/objectives";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";

/** Vista allenamento lato atleta: schede esercizio + (se circuito) timer interattivo. */
export function WorkoutView({ assignment, athleteName, onClose, onComplete }: { assignment: WorkAssignment; athleteName: string; onClose: () => void; onComplete: () => void }) {
  const items = assignment.prescription ?? [];
  const circuito = assignment.format === "circuito";

  return (
    <Modal onClose={onClose} size="xl">
      {/* header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">{athleteName} · {assignment.kind}</div>
            <h2 className="text-xl font-extrabold tracking-tight">{assignment.refName}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-background">✕</button>
        </div>
        {assignment.objective && (() => {
          const m = objectiveMeta(assignment.objective);
          return (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold" style={m ? { color: m.color, backgroundColor: `${m.color}1a` } : undefined}>
              <Icon name="target" size={13} /> {assignment.objective}{m ? ` · ${m.acr}` : ""}
            </div>
          );
        })()}
        {assignment.note && <div className="mt-1.5 text-[13px] text-muted">{assignment.note}</div>}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background/40 p-5">
        {circuito ? (
          <CircuitView assignment={assignment} items={items} onComplete={onComplete} />
        ) : (
          items.map((it, i) => <ExerciseCard key={it.exerciseId} index={i} item={it} />)
        )}
      </div>
    </Modal>
  );
}

// ---- Scheda esercizio (standard) -------------------------------------------
function ExerciseCard({ index, item }: { index: number; item: ExercisePrescription }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Esercizio {String(index + 1).padStart(2, "0")}</div>
      <h3 className="mt-0.5 text-lg font-extrabold tracking-tight">{item.name}{item.rpe != null && <span className="ml-2 rounded-md bg-background px-2 py-0.5 align-middle text-[12px] font-bold text-muted">RPE {item.rpe}</span>}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sets" value={item.sets != null ? `${item.sets}` : "1"} />
        <Stat label="Reps" value={item.reps ?? "—"} />
        <Stat label="Rest" value={item.restSec ? `${item.restSec}s` : "—"} />
        <Stat label="Intensità" value={item.intensity ?? (item.kg ? `${item.kg} kg` : "—")} />
      </div>
      {item.media && item.media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.media.map((m, i) => m.kind === "image"
            ? <img key={i} src={m.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            : <a key={i} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-2 text-[13px] font-medium text-muted hover:text-foreground"><Icon name="live" size={14} /> Video</a>)}
        </div>
      )}
      {item.note && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[13px] text-muted">
          <Icon name="link" size={14} className="brand-text" /> {item.note}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background py-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="mt-0.5 text-lg font-bold leading-tight">{value}</div>
    </div>
  );
}

// ---- Circuito + timer -------------------------------------------------------
function CircuitView({ assignment, items, onComplete }: { assignment: WorkAssignment; items: ExercisePrescription[]; onComplete: () => void }) {
  const rounds = assignment.rounds ?? 3;
  const roundRest = assignment.roundRestSec ?? 120;
  const total = rounds * items.length;

  const [step, setStep] = useState(0); // 0..total
  const [resting, setResting] = useState(false);
  const [left, setLeft] = useState(0);

  const done = step >= total;
  const round = Math.min(rounds, Math.floor(step / items.length) + 1);
  const exIdx = step % items.length;
  const current = items[exIdx];

  useEffect(() => {
    if (!resting) return;
    if (left <= 0) { setResting(false); setStep((s) => s + 1); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, left]);

  const advance = () => {
    const lastOfRound = exIdx === items.length - 1;
    if (lastOfRound && step < total - 1) { setResting(true); setLeft(roundRest); return; } // recupero tra i giri
    setStep((s) => s + 1);
  };

  return (
    <>
      {/* header circuito */}
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--brand-soft)" }}>
        <div className="brand-bg brand-on flex items-center justify-between px-5 py-3">
          <span className="flex items-center gap-2 font-bold"><Icon name="trend" size={18} /> CIRCUITO</span>
          <span className="text-[13px] font-semibold opacity-90">{rounds} giri · Rec {roundRest}s</span>
        </div>
        <div className="space-y-2 p-3">
          {items.map((it, i) => (
            <div key={it.exerciseId} className={`rounded-xl border p-3 transition-colors ${!done && i === exIdx && !resting ? "brand-soft-bg border-[var(--brand-primary)]" : "border-border"}`}>
              <div className="flex items-center gap-2">
                <span className="brand-text text-sm font-extrabold">{String.fromCharCode(65 + i)}</span>
                <span className="text-[15px] font-bold">{it.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                <span className="rounded-lg bg-background px-3 py-1.5"><span className="text-[10px] uppercase tracking-wide text-muted-2">Reps </span><b>{it.reps ?? "—"}</b></span>
                {it.kg ? <span className="text-muted">Intensità: <b className="text-foreground">{it.kg} kg</b></span> : null}
                {it.restSec ? <span className="text-muted">Rest: <b className="text-foreground">{it.restSec}s</b></span> : null}
              </div>
              {it.note && <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted"><Icon name="link" size={12} /> {it.note}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* timer */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-muted-2">
          <span className="flex items-center gap-1.5"><Icon name="stopwatch" size={15} className="brand-text" /> Timer circuito</span>
          {!done && <span>Giro <b className="text-foreground">{round}</b>/{rounds} · Esercizio <b className="text-foreground">{exIdx + 1}</b>/{items.length}</span>}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div className="brand-bg h-full rounded-full transition-all" style={{ width: `${(Math.min(step, total) / total) * 100}%` }} />
        </div>

        {done ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Icon name="trophy" size={24} /></span>
            <div className="font-bold">Allenamento completato</div>
            <button onClick={onComplete} className="brand-bg brand-on mt-1 rounded-xl px-5 py-2.5 text-sm font-semibold">Segna come completato</button>
          </div>
        ) : resting ? (
          <div className="mt-4 text-center">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Recupero tra i giri</div>
            <div className="brand-text my-1 text-5xl font-extrabold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
            <button onClick={() => { setResting(false); setStep((s) => s + 1); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Salta recupero</button>
          </div>
        ) : (
          <>
            <div className="mt-3 text-center text-lg font-extrabold">{current?.name}</div>
            <button onClick={advance} className="brand-bg brand-on mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold shadow-sm">
              <Icon name="link" size={18} /> Fatto · Avanti
            </button>
          </>
        )}
      </div>
    </>
  );
}
