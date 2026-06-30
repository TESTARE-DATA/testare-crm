"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Exercise, ExercisePrescription, SessionTemplate, WorkAssignment, WorkFormat, AssignmentKind, Athlete, ExerciseDomain, PlayerRole, TemplateDomain, SessionType } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { SESSION_OBJECTIVES, PRESCRIPTIVE_TYPES, objectiveMeta } from "@/lib/objectives";
import { SESSION_META, SESSION_TYPES } from "@/lib/sessions";
import { TYPE_LOAD } from "@/lib/microcycle";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { type CustomObjective, CreateObjectiveForm } from "./QuickCreate";
import { type BuildItem, SessionBuilder, buildContent, hasContent, prescriptionToItems } from "./SessionBuilder";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

export interface AssignTarget {
  kind: AssignmentKind;
  refId: string;
  refName: string;
  domain?: ExerciseDomain | TemplateDomain;
  durationMin: number;
  estRpe: number; // 1-10
  /** Esercizi da prescrivere (1 per esercizio singolo, N per template). */
  items: { exerciseId: string; name: string; durationMin?: number }[];
}

// Opzioni per la modalità "scegli dentro la card" (es. dal Calendario).
export type AssignExOpt = { id: string; name: string; domain: ExerciseDomain; durationMin: number; category: string };
export type AssignTplOpt = { id: string; name: string; domain: TemplateDomain; durationMin: number; rpe: number; items: { exerciseId: string; name: string; durationMin?: number }[] };
export interface AssignOptions { exercises: AssignExOpt[]; templates: AssignTplOpt[] }

// Tipo di seduta di default in base al dominio dell'esercizio/template assegnato.
const defaultSession = (target?: AssignTarget): SessionType =>
  target && (target.domain === "atletico" || target.domain === "palestra") ? "palestra" : "campo";
// Durata indicativa (min) per le sedute non prescrittive (senza esercizi).
const SESSION_DUR: Record<SessionType, number> = { campo: 75, palestra: 60, partita: 95, recupero: 40, video: 30, medico: 45, riposo: 0 };

/** Tasto "Assegna" che apre il modal di assegnazione + prescrizione. */
export function AssignButton({ clientId, athletes, target, variant = "ghost", defaultDate }: { clientId: string; athletes: Athlete[]; target: AssignTarget; variant?: "ghost" | "solid"; defaultDate?: string }) {
  const [open, setOpen] = useState(false);
  const cls = variant === "solid"
    ? "brand-bg brand-on rounded-lg px-3 py-1.5 text-[13px] font-semibold"
    : "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-foreground/80 hover:border-[var(--brand-primary)] hover:text-foreground";
  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className={cls}>
        <Icon name="plus" size={14} /> Assegna
      </button>
      {open && <AssignModal clientId={clientId} athletes={athletes} target={target} defaultDate={defaultDate} onClose={() => setOpen(false)} />}
    </>
  );
}

type Pres = { sets: string; reps: string; kg: string; rest: string; note: string };
const defPres = (): Pres => ({ sets: "3", reps: "10", kg: "", rest: "120", note: "" });

export function AssignModal({ clientId, athletes, target, options, onClose, lockedAthleteIds, defaultDate, defaultSessionType }: { clientId: string; athletes: Athlete[]; target?: AssignTarget; options?: AssignOptions; onClose: () => void; lockedAthleteIds?: string[]; defaultDate?: string; defaultSessionType?: SessionType }) {
  const { add } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const locked = !!lockedAthleteIds;
  const [sel, setSel] = useState<string[]>(lockedAthleteIds ?? []);
  const [date, setDate] = useState(defaultDate ?? "2026-06-19");
  const [sessionType, setSessionType] = useState<SessionType>(defaultSessionType ?? defaultSession(target));
  const [objective, setObjective] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<AssignTarget | null>(target ?? null);
  const [pres, setPres] = useState<Record<string, Pres>>(target ? Object.fromEntries(target.items.map((it) => [it.exerciseId, defPres()])) : {});
  const [format, setFormat] = useState<WorkFormat>("standard");
  const [rounds, setRounds] = useState("3");
  const [roundRest, setRoundRest] = useState("120");
  const [creating, setCreating] = useState<"" | "obj">("");
  const [sessionName, setSessionName] = useState("");
  const [items, setItems] = useState<BuildItem[]>([]); // contenuto del costruttore di sessione
  const circuito = format === "circuito";

  // Store locali: esercizi (drills), template e obiettivi creati dall'utente —
  // merge-ati nei menù così il creato si riusa qui e nelle altre sezioni.
  const { items: drills, add: addDrill } = useLocalCollection<Exercise>(`drills:${clientId}`);
  const { items: localTpls, add: addTpl } = useLocalCollection<SessionTemplate>(`templates:${clientId}`);
  const { items: customObjs } = useLocalCollection<CustomObjective>(`custom-objectives:${clientId}`);

  const exOpts: AssignExOpt[] = useMemo(() => [
    ...(options?.exercises ?? []),
    ...drills.map((d) => ({ id: d.id, name: d.name, domain: d.domain, durationMin: d.durationMin, category: String(d.category) })),
  ], [options, drills]);
  const exName = (id: string) => exOpts.find((e) => e.id === id)?.name ?? id;
  const tplOpts: AssignTplOpt[] = useMemo(() => [
    ...(options?.templates ?? []),
    ...localTpls.map((t) => ({ id: t.id, name: t.name, domain: t.domain, durationMin: t.estimated.durationMin, rpe: t.estimated.internalRpe, items: t.exerciseIds.map((id) => ({ exerciseId: id, name: exName(id), durationMin: exOpts.find((e) => e.id === id)?.durationMin })) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [options, localTpls, exOpts]);

  // Parti da un template esistente: pre-compila il costruttore.
  const loadTemplate = (t: AssignTplOpt) => {
    setSessionName(t.name);
    const full = localTpls.find((x) => x.id === t.id);
    const domain: ExerciseDomain = sessionType === "palestra" ? "atletico" : "tattico";
    if (full?.prescription?.length) setItems(() => prescriptionToItems(full.prescription!, full.circuits ?? [], domain));
    else setItems(() => prescriptionToItems(t.items.map((it) => ({ exerciseId: it.exerciseId, name: it.name })), [], domain));
  };

  // Tipo seduta: cambia obiettivo e, per le sedute non prescrittive, nasconde gli esercizi.
  const objCfg = SESSION_OBJECTIVES[sessionType];
  const prescriptive = PRESCRIPTIVE_TYPES.includes(sessionType);
  // Gruppi obiettivo = preimpostati per tipo + eventuali personalizzati creati.
  const objGroups = useMemo(() => {
    const base = objCfg ? objCfg.groups.map((g) => ({ group: g.group, color: g.color, items: g.items.map((it) => ({ value: it.label, label: `${it.label} · ${it.acr}` })) })) : [];
    const custom = customObjs.filter((c) => c.sessionType === sessionType);
    if (custom.length) base.push({ group: "Personalizzati", color: custom[0].color, items: custom.map((c) => ({ value: c.label, label: `${c.label} · ${c.acr}` })) });
    return base;
  }, [objCfg, customObjs, sessionType]);
  const changeSession = (t: SessionType) => {
    setSessionType(t);
    setObjective("");
    setCreating("");
    if (!PRESCRIPTIVE_TYPES.includes(t)) { setPicked(null); setPres({}); }
  };

  const setP = (id: string, k: keyof Pres, v: string) => setPres((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addRole = (role: PlayerRole) => setSel((s) => Array.from(new Set([...s, ...athletes.filter((a) => a.role === role).map((a) => a.id)])));
  const estLoad = picked ? Math.round(picked.durationMin * picked.estRpe) : TYPE_LOAD[sessionType];
  const durationMin = picked ? picked.durationMin : SESSION_DUR[sessionType];

  const submit = () => {
    if (sel.length === 0 || (prescriptive && !picked)) return;
    const objVal = objective.trim() || undefined;
    if (picked) {
      const prescription: ExercisePrescription[] = picked.items.map((it) => {
        const p = pres[it.exerciseId];
        return { exerciseId: it.exerciseId, name: it.name, sets: circuito ? undefined : p.sets ? +p.sets : undefined, reps: p.reps || undefined, kg: p.kg ? +p.kg : undefined, restSec: p.rest ? +p.rest : undefined, durationMin: it.durationMin, note: p.note || undefined };
      });
      add({
        id: newId(`${clientId}-asg`), clientId, kind: picked.kind, refId: picked.refId, refName: picked.refName,
        domain: picked.domain, sessionType, athleteIds: sel, date, objective: objVal, note: note || undefined, estLoad, durationMin: picked.durationMin,
        status: "assegnato", prescription,
        format, rounds: circuito ? +rounds : undefined, roundRestSec: circuito ? +roundRest : undefined,
      });
    } else {
      // Seduta non prescrittiva (partita/video/medico/riposo): nessun esercizio.
      add({
        id: newId(`${clientId}-asg`), clientId, kind: "seduta", refId: `seduta-${sessionType}`, refName: SESSION_META[sessionType].label,
        sessionType, athleteIds: sel, date, objective: objVal, note: note || undefined, estLoad: TYPE_LOAD[sessionType], durationMin: SESSION_DUR[sessionType],
        status: "assegnato",
      });
    }
    setDone(true);
    setTimeout(onClose, 1100);
  };

  // ---- Costruttore di sessione (modalità Calendario) ------------------------
  const builderMode = !!options && prescriptive;
  // Scrematura per tipo di seduta: campo → esercizi/template di campo, palestra e
  // recupero → di palestra. Suggerisce solo il contenuto inerente alla seduta.
  const exDomain: ExerciseDomain = sessionType === "campo" ? "tattico" : "atletico";
  const tplDomain: TemplateDomain = sessionType === "campo" ? "campo" : "palestra";
  const suggestedEx = useMemo(() => exOpts.filter((e) => e.domain === exDomain), [exOpts, exDomain]);
  const suggestedTpls = useMemo(() => tplOpts.filter((t) => t.domain === tplDomain), [tplOpts, tplDomain]);
  const estContent = useMemo(() => {
    const blocks = items.flatMap((it) => (it.kind === "single" ? [it.block] : it.blocks)).filter((b) => b.name.trim());
    const rpes = blocks.map((b) => +b.rpe).filter(Boolean);
    const avgRpe = rpes.length ? Math.round(rpes.reduce((s, n) => s + n, 0) / rpes.length) : 6;
    const durationMin = Math.max(20, blocks.length * 8);
    return { n: blocks.length, durationMin, estLoad: Math.round(durationMin * avgRpe) };
  }, [items]);
  const finalize = () => { setDone(true); setTimeout(onClose, 1100); };

  const saveSession = () => {
    if (sel.length === 0 || !hasContent(items)) return;
    const c = buildContent(items, clientId, exOpts);
    c.newExercises.forEach(addDrill);
    const name = sessionName.trim() || objective.trim() || `${SESSION_META[sessionType].label} personalizzata`;
    add({
      id: newId(`${clientId}-asg`), clientId, kind: "seduta", refId: `seduta-${sessionType}`, refName: name,
      domain: sessionType === "palestra" ? "palestra" : "campo", sessionType, athleteIds: sel, date, objective: objective.trim() || undefined, note: note || undefined,
      estLoad: Math.round(c.durationMin * c.avgRpe), durationMin: c.durationMin, status: "assegnato",
      prescription: c.prescription, circuits: c.circuits.length ? c.circuits : undefined,
    });
    finalize();
  };

  const saveTemplate = () => {
    if (!hasContent(items) || !sessionName.trim()) return;
    const c = buildContent(items, clientId, exOpts);
    c.newExercises.forEach(addDrill);
    const domain: TemplateDomain = sessionType === "palestra" ? "palestra" : "campo";
    const tpl: SessionTemplate = {
      id: newId(`${clientId}-tpl`), clientId, name: sessionName.trim(), domain, goal: objective.trim() || "",
      exerciseIds: c.prescription.map((p) => p.exerciseId), estimated: { durationMin: c.durationMin, internalRpe: c.avgRpe, externalKm: 0, sprints: 0, highIntensityM: 0 },
      prescription: c.prescription, circuits: c.circuits.length ? c.circuits : undefined, custom: true,
    };
    addTpl(tpl);
    if (sel.length > 0) add({
      id: newId(`${clientId}-asg`), clientId, kind: "template", refId: tpl.id, refName: tpl.name,
      domain, sessionType, athleteIds: sel, date, objective: objective.trim() || undefined, note: note || undefined,
      estLoad: Math.round(c.durationMin * c.avgRpe), durationMin: c.durationMin, status: "assegnato",
      prescription: c.prescription, circuits: tpl.circuits,
    });
    finalize();
  };

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Assegna" subtitle={<span><b style={{ color: SESSION_META[sessionType].color }}>{SESSION_META[sessionType].label}</b>{picked ? <> · {picked.refName}</> : objective ? <> · {objective}</> : ""}</span>} onClose={onClose} />
      {done ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Icon name="link" size={24} /></span>
          <div className="text-sm font-semibold">Assegnato a {sel.length} atleti</div>
          <div className="text-[12px] text-muted">Lo trovi in <b>Programmazione</b>.</div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <label className="block w-44"><span className="mb-1 block text-[12px] font-medium text-muted">Data</span><input type="date" className="inp" value={date} onChange={(e) => setDate(e.target.value)} /></label>

            {/* TIPO DI SEDUTA — guida obiettivo e contenuto */}
            <div>
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Tipo di seduta</div>
              <div className="flex flex-wrap gap-1.5">
                {SESSION_TYPES.map((t) => {
                  const m = SESSION_META[t];
                  const on = sessionType === t;
                  return (
                    <button key={t} onClick={() => changeSession(t)} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${on ? "border-transparent text-white" : "border-border text-muted hover:text-foreground"}`} style={on ? { backgroundColor: m.color } : undefined}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? "#fff" : m.color }} />{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COSTRUTTORE DI SESSIONE (modalità Calendario, sedute prescrittive) */}
            {builderMode && (
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Contenuto della sessione</span>
                  {suggestedTpls.length > 0 && (
                    <div className="w-56">
                      <SelectMenu
                        value=""
                        placeholder="Parti da un template…"
                        onChange={(v) => { const t = tplOpts.find((x) => x.id === v); if (t) loadTemplate(t); }}
                        groups={[{ label: `Template ${tplDomain}`, items: suggestedTpls.map((t) => ({ value: t.id, label: t.name })) }]}
                      />
                    </div>
                  )}
                </div>
                <input className="inp mb-2" placeholder="Nome sessione / template (es. Forza arti inferiori)" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                <SessionBuilder items={items} setItems={setItems} library={exOpts} suggestions={suggestedEx} defaultDomain={exDomain} />
              </div>
            )}

            {/* OBIETTIVO — personalizzato per tipo di seduta (riposo: nessun campo) */}
            {objCfg && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">{objCfg.fieldLabel}{objCfg.optional ? " (facoltativo)" : ""}</span>
                  <CreateBtn label="Obiettivo" active={creating === "obj"} onClick={() => setCreating(creating === "obj" ? "" : "obj")} />
                </div>
                <SelectMenu
                  value={objective}
                  placeholder={objCfg.placeholder}
                  onChange={setObjective}
                  groups={objGroups.map((g) => ({ label: g.group, color: g.color, items: g.items }))}
                />
                {creating === "obj" && (
                  <CreateObjectiveForm clientId={clientId} sessionType={sessionType} onCancel={() => setCreating("")} onCreated={(label) => { setObjective(label); setCreating(""); }} />
                )}
                {objective && (() => {
                  const m = objectiveMeta(objective) ?? (() => { const c = customObjs.find((x) => x.label === objective); return c ? { color: c.color, acr: c.acr } : undefined; })();
                  return m ? (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold" style={{ color: m.color, backgroundColor: `${m.color}1a` }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />{objective} · {m.acr}
                    </span>
                  ) : null;
                })()}
              </div>
            )}

            {picked && (<>
            {/* FORMATO */}
            <div>
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Formato</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-border bg-surface p-1">
                  {(["standard", "circuito"] as WorkFormat[]).map((f) => (
                    <button key={f} onClick={() => setFormat(f)} className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${format === f ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>{f === "standard" ? "A stazioni" : "Circuito"}</button>
                  ))}
                </div>
                {circuito && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <label className="flex items-center gap-1.5"><span className="text-muted">Giri</span><input className="pinp w-14" value={rounds} onChange={(e) => setRounds(e.target.value)} /></label>
                    <label className="flex items-center gap-1.5"><span className="text-muted">Rec. giri (s)</span><input className="pinp w-16" value={roundRest} onChange={(e) => setRoundRest(e.target.value)} /></label>
                  </div>
                )}
              </div>
            </div>

            {/* PRESCRIZIONE per esercizio */}
            <div>
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Prescrizione</div>
              <div className="space-y-2">
                {picked.items.map((it, i) => {
                  const p = pres[it.exerciseId];
                  return (
                    <div key={it.exerciseId} className="rounded-xl border border-border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="brand-soft-bg brand-text flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold">{circuito ? String.fromCharCode(65 + i) : i + 1}</span>
                        <span className="text-[13px] font-bold">{it.name}</span>
                      </div>
                      <div className={`grid gap-2 ${circuito ? "grid-cols-3" : "grid-cols-4"}`}>
                        {!circuito && <PField label="Serie"><input className="pinp" value={p.sets} onChange={(e) => setP(it.exerciseId, "sets", e.target.value)} /></PField>}
                        <PField label="Rip."><input className="pinp" value={p.reps} onChange={(e) => setP(it.exerciseId, "reps", e.target.value)} /></PField>
                        <PField label="kg"><input className="pinp" value={p.kg} onChange={(e) => setP(it.exerciseId, "kg", e.target.value)} placeholder="—" /></PField>
                        <PField label="Rec. (s)"><input className="pinp" value={p.rest} onChange={(e) => setP(it.exerciseId, "rest", e.target.value)} /></PField>
                      </div>
                      <input className="inp mt-2 text-[13px]" value={p.note} onChange={(e) => setP(it.exerciseId, "note", e.target.value)} placeholder="Indicazioni (es. profondi e lenti)…" />
                    </div>
                  );
                })}
              </div>
            </div>
            </>)}

            <label className="block"><span className="mb-1 block text-[12px] font-medium text-muted">Note (opzionale)</span><input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. tecnica, tempo controllato…" /></label>

            {/* A CHI (nascosto se locked) */}
            {!locked && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-muted">A chi · {sel.length} selezionati</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setSel(athletes.map((a) => a.id))} className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-background">Tutta la squadra</button>
                    {sel.length > 0 && <button onClick={() => setSel([])} className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted hover:bg-background">Azzera</button>}
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">{ROLES.map((r) => <button key={r} onClick={() => addRole(r)} className="brand-soft-bg brand-text rounded-full px-2.5 py-0.5 text-[11px] font-medium">+ {r.slice(0, 4)}.</button>)}</div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
                  {athletes.map((a) => {
                    const on = sel.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => toggle(a.id)} className={`flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left last:border-0 ${on ? "brand-soft-bg" : "hover:bg-background"}`}>
                        <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} shirtNumber={a.shirtNumber} size={28} />
                        <span className="flex-1 truncate text-sm font-medium">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></span>
                        <span className="text-[11px] text-muted-2">{a.role.slice(0, 3)}</span>
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${on ? "brand-bg border-transparent text-white" : "border-border"}`}>{on && <span className="text-[9px]">✓</span>}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sessionType !== "riposo" && (
              <div className="brand-soft-bg flex items-center justify-between rounded-xl px-3 py-2 text-[13px]">
                <span className="text-muted">Carico interno stimato</span>
                {builderMode ? (
                  <span className="brand-text font-bold">{estContent.estLoad} AU <span className="font-normal text-muted">· {estContent.durationMin}′ · {estContent.n} esercizi</span></span>
                ) : (
                  <span className="brand-text font-bold">{estLoad} AU <span className="font-normal text-muted">· {durationMin}′{picked ? ` · RPE ~${picked.estRpe}` : ""}</span></span>
                )}
              </div>
            )}
          </div>
          {builderMode ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-3">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
              <button onClick={saveTemplate} disabled={!hasContent(items) || !sessionName.trim()} className="rounded-lg border border-[var(--brand-primary)] px-4 py-2 text-sm font-semibold brand-text disabled:opacity-40" title="Salva come template riutilizzabile (e assegna, se hai scelto gli atleti)"><Icon name="layers" size={14} className="-mt-0.5 mr-1 inline" />Salva come template</button>
              <button onClick={saveSession} disabled={!hasContent(items) || sel.length === 0} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">Salva sessione · {sel.length}</button>
            </div>
          ) : (
            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
              <button onClick={submit} disabled={(prescriptive && !picked) || sel.length === 0} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">{locked ? "Assegna" : `Assegna a ${sel.length}`}</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-0.5 block text-center text-[10px] font-medium uppercase tracking-wide text-muted-2">{label}</span>{children}</label>;
}

/** Pulsantino "+ Crea" accanto alle etichette dei menù. */
function CreateBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${active ? "brand-bg brand-on border-transparent" : "border-border text-muted hover:border-[var(--brand-primary)] hover:text-foreground"}`}>
      <Icon name="plus" size={12} /> {label}
    </button>
  );
}

// ---- Dropdown custom: pannello a posizione fixed (non esce mai dallo schermo,
//      scrolla internamente) — sostituisce i <select> nativi del modale.
type MenuItem = { value: string; label: string };
type MenuGroup = { label: string; color?: string; items: MenuItem[] };
type FixedPos = { left: number; width: number; top?: number; bottom?: number };

function SelectMenu({ value, placeholder, groups, onChange }: { value: string; placeholder: string; groups: MenuGroup[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<FixedPos | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const MAX = 288; // px (~ max-h pannello)
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const dropUp = below < Math.min(MAX, 240) && r.top > below;
      setPos(dropUp
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 4 }
        : { left: r.left, width: r.width, top: r.bottom + 4 });
    }
    setOpen((o) => !o);
  };

  const current = groups.flatMap((g) => g.items).find((i) => i.value === value);
  const currentColor = groups.find((g) => g.items.some((i) => i.value === value))?.color;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className="inp flex items-center justify-between gap-2 text-left">
        <span className="truncate" style={current && currentColor ? { color: currentColor } : undefined}>
          {current ? <span className={currentColor ? "font-semibold" : ""}>{current.label}</span> : <span className="text-muted-2">{placeholder}</span>}
        </span>
        <Icon name="chevron" size={14} className={`shrink-0 text-muted-2 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && pos && (
        <div className="fixed z-[100] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl" style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: MAX }}>
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-muted-2 hover:bg-background">{placeholder}</button>
          {groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-1.5 px-2.5 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-2">
                {g.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />}{g.label}
              </div>
              {g.items.map((it) => (
                <button key={it.value} type="button" onClick={() => { onChange(it.value); setOpen(false); }}
                  className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-background ${it.value === value ? "brand-soft-bg font-semibold" : ""}`}
                  style={g.color ? { color: g.color } : undefined}>
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
