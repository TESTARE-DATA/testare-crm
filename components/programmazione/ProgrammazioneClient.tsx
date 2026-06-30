"use client";

import { useMemo, useState } from "react";
import type { WorkAssignment, Athlete, Exercise, SessionTemplate } from "@/lib/types";
import { tierOf } from "@/lib/perf";
import { useLocalCollection } from "@/lib/store";
import { useRoster } from "@/lib/useRoster";
import { usePhotos } from "@/lib/usePhotos";
import { readinessTier } from "@/lib/readiness-core";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { Badge, PageHeader, Panel, StatCard, TierBadge } from "@/components/ui";
import { AssignModal, type AssignTarget } from "./AssignButton";
import { WorkoutView } from "./WorkoutView";
import { ProgressChart } from "./ProgressChart";
import { PianoView } from "./PianoView";

const ATH_RPE: Record<string, number> = { Forza: 7, Potenza: 7, Sprint: 8, Rapidità: 6, Pliometria: 7, Prevenzione: 4, Core: 4, Mobilità: 3 };
const TODAY = "2026-06-19";
const DAY = 86400000;
type Item = { exerciseId: string; name: string; durationMin?: number };
type ExRef = { id: string; name: string; domain: string; durationMin: number; category: string };
type TplRef = { id: string; name: string; domain: string; durationMin: number; rpe: number; items: Item[] };
type Gps = { athleteId: string; date: string; sRPE: number; durationMin: number };
type Hist = { athleteId: string; exerciseId: string; exName: string; date: string; kg: number; sets: number; reps: number };

function inWeek(date: string) {
  const d = Date.parse(TODAY + "T00:00:00") - Date.parse(date + "T00:00:00");
  return d >= 0 ? d < 7 * DAY : d > -7 * DAY; // settimana corrente ±
}

type MonitoraggioProps = { clientId: string; athletes: Athlete[]; exercises: ExRef[]; templates: TplRef[]; gps: Gps[]; history: Hist[]; readiness: Record<string, number>; testDates: Record<string, string> };

export function ProgrammazioneClient(props: MonitoraggioProps & { seedMatchDates: string[] }) {
  const [tab, setTab] = useState<"piano" | "monitoraggio">("piano");
  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Piano di Allenamento" subtitle="Periodizzazione stagionale: macrociclo, mesocicli e microcicli — corsie tattica (campo) e fisica (palestra)" icon="target" />
      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
        {([["piano", "Piano stagionale", "calendar"], ["monitoraggio", "Monitoraggio atleti", "users"]] as const).map(([k, label, icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors ${tab === k ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}
          >
            <Icon name={icon} size={15} /> {label}
          </button>
        ))}
      </div>
      {tab === "piano" ? <PianoView clientId={props.clientId} seedMatchDates={props.seedMatchDates} /> : <MonitoraggioView {...props} />}
    </div>
  );
}

function MonitoraggioView({ clientId, athletes: seed, exercises, templates, gps, history, readiness, testDates }: MonitoraggioProps) {
  const { items, remove, update } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const { athletes } = useRoster(clientId, seed);
  const { photos } = usePhotos(clientId);
  const [openId, setOpenId] = useState<string | null>(null);

  const byAthlete = (id: string) => items.filter((a) => a.athleteIds.includes(id));
  const plannedWeek = (id: string) => byAthlete(id).filter((a) => inWeek(a.date)).reduce((s, a) => s + a.estLoad, 0);

  const totalAssigned = new Set(items.flatMap((a) => a.athleteIds)).size;
  const plannedTeam = items.filter((a) => inWeek(a.date)).reduce((s, a) => s + a.estLoad * a.athleteIds.length, 0);

  const selected = openId ? athletes.find((a) => a.id === openId) : null;

  return (
    <div className="fade-up">
      {!selected ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Atleti con lavoro" value={totalAssigned} tone="brand" icon="users" />
            <StatCard label="Assegnazioni attive" value={items.length} icon="clipboard" />
            <StatCard label="Carico programmato" value={plannedTeam.toLocaleString("it-IT")} hint="AU · settimana" tone="good" icon="load" />
            <StatCard label="Da completare" value={items.filter((a) => a.status === "assegnato").length} tone="warn" icon="stopwatch" />
          </div>

          <Panel title="Rosa · lavoro assegnato">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                    <th className="px-4 py-2.5 font-semibold">Atleta</th>
                    <th className="px-3 py-2.5 font-semibold">Readiness</th>
                    <th className="px-3 py-2.5 font-semibold">P-Index</th>
                    <th className="px-3 py-2.5 font-semibold">Assegnazioni</th>
                    <th className="px-3 py-2.5 font-semibold">Carico programmato (sett.)</th>
                    <th className="px-3 py-2.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a) => {
                    const n = byAthlete(a.id).length;
                    const pw = plannedWeek(a.id);
                    const rd = readiness[a.id];
                    const rdT = rd != null ? readinessTier(rd) : null;
                    const td = testDates[a.id];
                    return (
                      <tr key={a.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-background" onClick={() => setOpenId(a.id)}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={46} />
                            <span className="font-medium">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{rdT ? <span className="text-lg font-extrabold" style={{ color: rdT.color }}>{rd}%</span> : <span className="text-muted-2">—</span>}</td>
                        <td className="px-3 py-2.5">
                          <span className="brand-text font-bold">{a.profile.pIndex}°</span>
                          <div className="text-[10px] text-muted-2">{td ? `test ${fmtShort(td)}` : "no test"}</div>
                        </td>
                        <td className="px-3 py-2.5">{n > 0 ? <Badge tone="brand">{n}</Badge> : <span className="text-muted-2">—</span>}</td>
                        <td className="px-3 py-2.5 font-mono text-muted">{pw ? `${pw} AU` : "—"}</td>
                        <td className="px-3 py-2.5 text-right"><Icon name="chevron" size={16} className="text-muted-2" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          {items.length === 0 && (
            <div className="brand-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
              <Icon name="link" size={18} className="brand-text" />
              Nessun lavoro ancora assegnato. Vai in <b>Esercitazioni</b>, <b>Esercizi</b> o <b>Template</b> e usa il tasto <b>“Assegna”</b>, oppure apri un atleta qui e assegna direttamente.
            </div>
          )}
        </>
      ) : (
        <AthleteDetail
          clientId={clientId} athlete={selected} readiness={readiness[selected.id]} testDate={testDates[selected.id]} assignments={byAthlete(selected.id)} gps={gps.filter((g) => g.athleteId === selected.id)}
          exercises={exercises} templates={templates} history={history.filter((h) => h.athleteId === selected.id)} onBack={() => setOpenId(null)} onRemove={remove} onUpdate={update}
        />
      )}
    </div>
  );
}

function AthleteDetail({ clientId, athlete: a, readiness, testDate, assignments, gps, exercises, templates, history, onBack, onRemove, onUpdate }: {
  clientId: string; athlete: Athlete; readiness?: number; testDate?: string; assignments: WorkAssignment[]; gps: Gps[]; exercises: ExRef[]; templates: TplRef[]; history: Hist[];
  onBack: () => void; onRemove: (id: string) => void; onUpdate: (id: string, patch: Partial<WorkAssignment>) => void;
}) {
  const { photos } = usePhotos(clientId);
  // Includi esercizi (Campo Live / QuickCreate) e template creati dall'utente, così
  // l'assegnazione dalla scheda atleta vede gli stessi contenuti del Calendario.
  const { items: drills } = useLocalCollection<Exercise>(`drills:${clientId}`);
  const { items: localTpls } = useLocalCollection<SessionTemplate>(`templates:${clientId}`);
  const allExercises: ExRef[] = useMemo(() => [
    ...exercises,
    ...drills.map((d) => ({ id: d.id, name: d.name, domain: String(d.domain), durationMin: d.durationMin, category: String(d.category) })),
  ], [exercises, drills]);
  const allTemplates: TplRef[] = useMemo(() => [
    ...templates,
    ...localTpls.map((t) => ({
      id: t.id, name: t.name, domain: String(t.domain), durationMin: t.estimated.durationMin, rpe: t.estimated.internalRpe,
      items: t.exerciseIds.map((id) => { const ex = allExercises.find((e) => e.id === id); return { exerciseId: id, name: ex?.name ?? id, durationMin: ex?.durationMin }; }),
    })),
  ], [templates, localTpls, allExercises]);
  const [picker, setPicker] = useState(false);
  const [tgt, setTgt] = useState<AssignTarget | null>(null);
  const [workout, setWorkout] = useState<WorkAssignment | null>(null);
  const histExIds = [...new Set(history.map((h) => h.exerciseId))];
  const [histEx, setHistEx] = useState(histExIds[0] ?? "");
  const [metric, setMetric] = useState<"kg" | "vol">("kg");
  const histRows = useMemo(() => history.filter((h) => h.exerciseId === histEx).sort((x, y) => x.date.localeCompare(y.date)), [history, histEx]);
  // In modalità Volume i valori sono tonnellaggio in TONNELLATE, coerenti con le
  // MiniStat sopra (e con l'unità "t" passata al grafico): niente "3000 kg" vs "3.0 t".
  const histData = histRows.map((h) => ({ label: fmtShort(h.date), value: metric === "kg" ? h.kg : Math.round((h.sets * h.reps * h.kg) / 100) / 10 }));
  const histStats = useMemo(() => {
    if (histRows.length === 0) return null;
    const prRow = histRows.reduce((m, h) => (h.kg > m.kg ? h : m), histRows[0]);
    const oneRm = Math.round(prRow.kg * (1 + prRow.reps / 30)); // Epley
    const last = histRows[histRows.length - 1];
    const vols = histRows.map((h) => h.sets * h.reps * h.kg);
    return {
      pr: prRow.kg, oneRm,
      volMax: Math.max(...vols), volAvg: Math.round(vols.reduce((s, v) => s + v, 0) / vols.length),
      lastSets: last.sets, lastReps: last.reps, lastKg: last.kg, lastVol: last.sets * last.reps * last.kg,
    };
  }, [histRows]);
  const p = a.profile;
  const dPI = p.pIndex - p.prev.pIndex;

  const plannedWeek = assignments.filter((x) => inWeek(x.date)).reduce((s, x) => s + x.estLoad, 0);
  const weekGps = gps.filter((g) => inWeek(g.date));
  const actualWeek = weekGps.reduce((s, g) => s + g.sRPE, 0);
  const volumeWeek = weekGps.reduce((s, g) => s + g.durationMin, 0);
  const weekSessions = weekGps.length;
  const avgSession = weekSessions ? Math.round(actualWeek / weekSessions) : 0;

  const series = useMemo(() => {
    const out: { date: string; sRPE: number }[] = [];
    // Base in UTC ("...Z") per allinearsi alle date GPS (generate in UTC): senza la
    // Z, in fuso UTC+ ogni barra mostrerebbe l'sRPE del giorno precedente.
    for (let d = 9; d >= 0; d--) { const ds = new Date(Date.parse(TODAY + "T00:00:00Z") - d * DAY).toISOString().slice(0, 10); out.push({ date: ds, sRPE: gps.filter((g) => g.date === ds).reduce((s, g) => s + g.sRPE, 0) }); }
    return out;
  }, [gps]);
  const maxS = Math.max(1, ...series.map((s) => s.sRPE));

  const sorted = [...assignments].sort((x, y) => y.date.localeCompare(x.date));

  return (
    <div className="fade-up">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><Icon name="arrowLeft" size={15} /> Tutta la rosa</button>

      <div className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={64} />
        <div className="flex-1">
          <div className="flex items-center gap-2.5"><h1 className="text-2xl font-bold">{a.firstName} {a.lastName}</h1><TierBadge tier={tierOf(p.pIndex)} /></div>
          <div className="text-sm text-muted">{a.role} · #{a.shirtNumber}</div>
        </div>
        <button onClick={() => setPicker(true)} className="brand-bg brand-on flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"><Icon name="target" size={16} /> Assegna lavoro</button>
      </div>

      {/* KPI monitoraggio */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Readiness" value={readiness != null ? `${readiness}%` : "—"} tone={readiness != null && readiness >= 65 ? "good" : "warn"} hint="wellness odierno" icon="trend" />
        <StatCard label="P-Index" value={`${p.pIndex}°`} tone="brand" hint={`${testDate ? `Test ${fmtShort(testDate)}` : "—"} · Δ ${dPI > 0 ? "+" : ""}${dPI}`} icon="trophy" />
        <StatCard label="Carico programmato" value={`${plannedWeek}`} hint="AU · settimana" icon="clipboard" />
        <StatCard label="Carico reale" value={`${actualWeek}`} hint="sRPE · settimana" tone="good" icon="load" />
        <StatCard label="Volume reale" value={`${volumeWeek}′`} hint="minuti · settimana" icon="stopwatch" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lavoro assegnato */}
        <Panel title="Lavoro assegnato" className="lg:col-span-2">
          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nessun lavoro assegnato. Usa “Assegna lavoro”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="brand-soft-bg brand-text flex h-9 w-9 items-center justify-center rounded-lg"><Icon name={x.kind === "template" ? "layers" : x.domain === "atletico" || x.domain === "palestra" ? "dumbbell" : "pitch"} size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{x.refName}</div>
                    {x.objective && <div className="truncate text-[12px] font-medium brand-text">🎯 {x.objective}</div>}
                    <div className="text-[12px] text-muted">{fmt(x.date)} · {x.kind} · {x.estLoad} AU{x.note ? ` · ${x.note}` : ""}</div>
                    {x.prescription && x.prescription.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {x.prescription.map((pr, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-[12px]">
                            {x.kind === "template" && <span className="truncate font-medium">{pr.name}</span>}
                            <span className="brand-text font-mono font-semibold">{presLabel(pr)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {x.format === "circuito" && <Badge tone="brand">circuito</Badge>}
                  <Badge tone={x.status === "completato" ? "green" : "amber"}>{x.status}</Badge>
                  <button onClick={() => setWorkout(x)} className="brand-soft-bg brand-text rounded-lg px-2.5 py-1.5 text-[12px] font-semibold" title="Apri scheda allenamento">Apri</button>
                  <button onClick={() => onRemove(x.id)} className="rounded p-1 text-muted-2 hover:text-red-600" title="Rimuovi">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Carico interno reale (sRPE) — andamento e sintesi settimana */}
        <Panel title="Carico interno · andamento" action={<span className="text-[11px] text-muted-2">sRPE · 10 giorni</span>}>
          <div className="p-4">
            <div className="flex items-end gap-1.5" style={{ height: 96 }}>
              {series.map((s) => {
                const isMatch = s.sRPE >= 0.9 * maxS && s.sRPE > 0;
                return (
                  <div key={s.date} className="flex flex-1 flex-col items-center">
                    <div className="w-full rounded-t" style={{ height: `${(s.sRPE / maxS) * 84}px`, minHeight: s.sRPE ? 3 : 0, backgroundColor: isMatch ? "var(--bad)" : "var(--brand-primary)" }} title={`${s.date}: ${s.sRPE} AU`} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-2"><span>{series[0].date.slice(8, 10)}/{series[0].date.slice(5, 7)}</span><span>oggi</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat label="Media seduta" value={`${avgSession}`} hint="sRPE · settimana" />
              <MiniStat label="Sedute" value={`${weekSessions}`} hint="settimana corrente" />
            </div>
          </div>
        </Panel>
      </div>

      {histExIds.length > 0 && histStats && (
        <Panel className="mt-6" title="Storico esercizi · carico e volume" action={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-1">
              {([["kg", "Carico"], ["vol", "Volume"]] as const).map(([m, l]) => (
                <button key={m} onClick={() => setMetric(m)} className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${metric === m ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>{l}</button>
              ))}
            </div>
            <select className="inp w-auto py-1 text-[13px]" value={histEx} onChange={(e) => setHistEx(e.target.value)}>
              {histExIds.map((id) => <option key={id} value={id}>{history.find((h) => h.exerciseId === id)?.exName ?? id}</option>)}
            </select>
          </div>
        }>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {metric === "kg" ? (
                <>
                  <MiniStat label="Massimale" value={`${histStats.pr} kg`} hint="miglior carico" />
                  <MiniStat label="1RM stimato" value={`${histStats.oneRm} kg`} hint="formula Epley" />
                  <MiniStat label="Ultima seduta" value={`${histStats.lastSets}×${histStats.lastReps}`} hint={`@ ${histStats.lastKg} kg`} />
                </>
              ) : (
                <>
                  <MiniStat label="Volume max" value={`${(histStats.volMax / 1000).toFixed(1)} t`} hint="seduta migliore" />
                  <MiniStat label="Volume medio" value={`${(histStats.volAvg / 1000).toFixed(1)} t`} hint="per seduta" />
                  <MiniStat label="Ultima seduta" value={`${(histStats.lastVol / 1000).toFixed(1)} t`} hint={`${histStats.lastSets}×${histStats.lastReps} @ ${histStats.lastKg} kg`} />
                </>
              )}
            </div>
            <div className="mx-auto max-w-2xl">
              <ProgressChart data={histData} unit={metric === "kg" ? "kg" : "t"} height={160} />
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-2">{metric === "kg" ? "Carico = peso massimo sollevato per seduta · 1RM stimato con formula di Epley." : "Volume = serie × ripetizioni × carico (tonnellaggio per seduta)."}</p>
          </div>
        </Panel>
      )}

      {picker && <AssignPicker athlete={a} exercises={allExercises} templates={allTemplates} onClose={() => setPicker(false)} onPick={(t) => { setPicker(false); setTgt(t); }} />}
      {tgt && <AssignModal clientId={clientId} athletes={[a]} target={tgt} lockedAthleteIds={[a.id]} onClose={() => setTgt(null)} />}
      {workout && <WorkoutView assignment={workout} athleteName={`${a.firstName} ${a.lastName}`} onClose={() => setWorkout(null)} onComplete={() => { onUpdate(workout.id, { status: "completato" }); setWorkout(null); }} />}
    </div>
  );
}

function AssignPicker({ athlete, exercises, templates, onClose, onPick }: { athlete: Athlete; exercises: ExRef[]; templates: TplRef[]; onClose: () => void; onPick: (t: AssignTarget) => void }) {
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();
  const exF = exercises.filter((e) => e.name.toLowerCase().includes(ql));
  const tplF = templates.filter((t) => t.name.toLowerCase().includes(ql));

  const pickEx = (e: ExRef) => onPick({ kind: "esercizio", refId: e.id, refName: e.name, domain: e.domain as AssignTarget["domain"], durationMin: e.durationMin, estRpe: e.domain === "tattico" ? 7 : ATH_RPE[e.category] ?? 6, items: [{ exerciseId: e.id, name: e.name, durationMin: e.durationMin }] });
  const pickTpl = (t: TplRef) => onPick({ kind: "template", refId: t.id, refName: t.name, domain: t.domain as AssignTarget["domain"], durationMin: t.durationMin, estRpe: t.rpe, items: t.items });

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={`Assegna a ${athlete.lastName}`} subtitle="Scegli un esercizio o un template, poi imposta la prescrizione" onClose={onClose} />
      <div className="flex shrink-0 gap-2 border-b border-border px-6 py-3">
        <input className="inp" placeholder="Cerca esercizio o template…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tplF.length > 0 && <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-2">Template</div>}
        {tplF.map((t) => (
          <button key={t.id} onClick={() => pickTpl(t)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-background">
            <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg"><Icon name="layers" size={16} /></span>
            <span className="flex-1 text-sm font-medium">{t.name}</span>
            <span className="text-[12px] text-muted">{t.domain} · {t.items.length} es.</span>
          </button>
        ))}
        <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-2">Esercizi</div>
        {exF.map((e) => (
          <button key={e.id} onClick={() => pickEx(e)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-background">
            <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg"><Icon name={e.domain === "atletico" ? "dumbbell" : "pitch"} size={16} /></span>
            <span className="flex-1 truncate text-sm font-medium">{e.name}</span>
            <span className="text-[12px] text-muted">{e.category}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function presLabel(pr: { sets?: number; reps?: string; kg?: number; restSec?: number; durationMin?: number }) {
  const parts: string[] = [];
  if (pr.sets || pr.reps) parts.push(`${pr.sets ?? "—"}×${pr.reps ?? "—"}`);
  if (pr.kg) parts.push(`@ ${pr.kg}kg`);
  if (pr.restSec) parts.push(`rec ${pr.restSec}s`);
  if (!parts.length && pr.durationMin) parts.push(`${pr.durationMin}′`);
  return parts.join(" · ") || "—";
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-2">{label}</div>
      <div className="mt-1 text-xl font-bold leading-none tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
function fmt(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); }
function fmtShort(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" }); }
