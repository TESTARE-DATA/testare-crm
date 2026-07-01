"use client";

import { useMemo, useState } from "react";
import { useLocalCollection, newId } from "@/lib/store";
import { usePhotos } from "@/lib/usePhotos";
import {
  RE_QUESTIONNAIRE, DOMS_AREAS, RE_CONFIG, FLAG_META, flagFromScore,
  type ReadinessState, type TeamReadiness, type ReItem, type Flag,
} from "@/lib/readinessEngine-core";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { ReadinessChart, type RPoint } from "@/components/readiness/ReadinessChart";

const levelOf = (flag: Flag) => (flag === "green" ? "Nella norma" : flag === "amber" ? "Sotto la norma" : "Molto sotto");

interface EditMark { id: string; athleteId: string; date: string }

export function ReadinessClient({ clientId, states, team }: { clientId: string; states: ReadinessState[]; team: TeamReadiness }) {
  const { photos } = usePhotos(clientId);
  const { items: edits, add } = useLocalCollection<EditMark>(`readiness-edit:${clientId}`);
  const [editing, setEditing] = useState<ReadinessState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = states[0]?.date ?? "";
  const markedToday = useMemo(() => new Set(edits.filter((e) => e.date === today).map((e) => e.athleteId)), [edits, today]);
  const isCompiled = (s: ReadinessState) => s.compiledToday || markedToday.has(s.athlete.id);

  // Ordine: prima chi richiede attenzione (rosso→ambra), poi non compilati, infine verdi.
  const rows = useMemo(() => {
    const rank = (s: ReadinessState) => {
      if (!isCompiled(s)) return 2; // non compilato
      const f = s.readinessScore != null ? flagFromScore(s.readinessScore) : "green";
      return f === "red" ? 0 : f === "amber" ? 1 : 3;
    };
    return [...states].sort((a, b) => rank(a) - rank(b) || (a.readinessScore ?? a.lastScore ?? 999) - (b.readinessScore ?? b.lastScore ?? 999));
  }, [states, markedToday]); // eslint-disable-line react-hooks/exhaustive-deps

  const teamFlag = team.todayAvg != null ? flagFromScore(team.todayAvg) : "green";
  const teamPts: RPoint[] = team.days.map((d) => ({ date: d.date, score: d.avg, flag: d.avg != null ? flagFromScore(d.avg) : "green" }));
  // "Da monitorare" coerente col punteggio mostrato (o item critico / red flag clinico).
  const watch = states.filter((s) => isCompiled(s) && s.readinessScore != null && (flagFromScore(s.readinessScore) !== "green" || s.itemAlert || s.clinicalFlag))
    .sort((a, b) => (a.readinessScore ?? 0) - (b.readinessScore ?? 0));
  const notCompiled = states.filter((s) => !isCompiled(s));

  function saveEdit(athleteId: string) {
    add({ id: newId("rded"), athleteId, date: today });
    setEditing(null);
  }

  return (
    <div className="space-y-5">
      {/* Squadra */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card brand-topline p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Readiness squadra · ultimi {team.days.length} giorni</h2>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="text-4xl font-extrabold leading-none" style={{ color: FLAG_META[teamFlag].color }}>{team.todayAvg ?? "—"}<span className="text-lg text-muted-2">/100</span></span>
                {team.delta != null && <DeltaChip d={team.delta} />}
              </div>
              <div className="mt-1 text-[12px] text-muted-2">oggi · <span className="font-semibold text-foreground/70">media 14 gg: {team.avg14 ?? "—"}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FlagPill flag="green" n={team.flagCounts.green} />
              <FlagPill flag="amber" n={team.flagCounts.amber} />
              <FlagPill flag="red" n={team.flagCounts.red} />
              {team.notCompiled > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-700"><Icon name="warning" size={13} /> {team.notCompiled} non compilato</span>
              )}
            </div>
          </div>
          <ReadinessChart points={teamPts} height={210} />
          <p className="mt-1 text-[11px] text-muted-2">50 = media individuale di ogni atleta. La readiness è lo z-score sulla baseline personale, non un valore assoluto.</p>
        </div>

        {/* Da monitorare */}
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon name="medical" size={16} className="text-warn" /> Da monitorare oggi
          </div>
          {watch.length === 0 && notCompiled.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Tutti nella norma e check-in completi. 👏</p>
          ) : (
            <ul className="space-y-1.5">
              {watch.map((s) => (
                <li key={s.athlete.id} className="flex items-center gap-2.5 rounded-lg bg-background p-2">
                  <Avatar firstName={s.athlete.firstName} lastName={s.athlete.lastName} photoUrl={photos[s.athlete.id]} size={28} />
                  <span className="flex-1 truncate text-[13px] font-medium">{s.athlete.lastName}</span>
                  {s.clinicalFlag && <Icon name="medical" size={13} className="text-red-600" />}
                  {s.itemAlert && <Icon name="warning" size={12} className="text-amber-600" />}
                  <span className="text-sm font-bold" style={{ color: FLAG_META[flagFromScore(s.readinessScore ?? 0)].color }}>{s.readinessScore}</span>
                </li>
              ))}
              {notCompiled.map((s) => (
                <li key={s.athlete.id} className="flex items-center gap-2.5 rounded-lg bg-amber-50/60 p-2">
                  <Avatar firstName={s.athlete.firstName} lastName={s.athlete.lastName} photoUrl={photos[s.athlete.id]} size={28} />
                  <span className="flex-1 truncate text-[13px] font-medium">{s.athlete.lastName}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><Icon name="warning" size={12} /> manca</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Atleti */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Readiness per atleta</h2>
          <span className="text-[12px] text-muted">variazione vs giorno precedente</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((s) => {
            const a = s.athlete;
            const compiled = isCompiled(s);
            const dispScore = s.readinessScore ?? s.lastScore;
            const dispFlag = dispScore != null ? flagFromScore(dispScore) : "green";
            const fm = FLAG_META[dispFlag];
            const isOpen = expanded === a.id;
            const scores = s.history.filter((h) => h.score != null).map((h) => h.score as number);
            return (
              <li key={a.id}>
                <div className="flex items-center gap-4 px-5 py-3">
                  <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id]} shirtNumber={a.shirtNumber} size={40} />
                  <div className="min-w-0 flex-1 sm:flex-none sm:w-52">
                    <div className="truncate text-sm font-semibold">{a.lastName} {a.firstName}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      <span>{a.role}</span>
                      {compiled && s.clinicalFlag && <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-700"><Icon name="medical" size={11} /> {s.clinicalFlag[0]}</span>}
                      {compiled && s.itemAlert && !s.clinicalFlag && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700"><Icon name="warning" size={11} /> item critico</span>}
                      {compiled && s.baselineStatus === "provisional" && <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-2">baseline in costruzione</span>}
                    </div>
                  </div>
                  <div className="hidden min-w-0 flex-1 sm:block"><Sparkline points={scores} /></div>

                  {compiled ? (
                    <>
                      <div className="w-16 shrink-0 text-right">
                        <div className="text-lg font-extrabold leading-none" style={{ color: fm.color }}>{dispScore ?? "—"}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-2">{dispScore != null ? levelOf(dispFlag) : ""}</div>
                      </div>
                      <div className="w-14 shrink-0 text-right">{s.deltaVsPrev != null ? <DeltaChip d={s.deltaVsPrev} sm /> : <span className="text-[11px] text-muted-2">—</span>}</div>
                    </>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5" title="Check-in di oggi non compilato dall'atleta">
                      <Icon name="warning" size={16} className="text-amber-600" />
                      <div className="leading-tight">
                        <div className="text-[11px] font-semibold text-amber-700">Non compilato</div>
                        {s.lastScore != null && <div className="text-[10px] text-amber-700/70">ultimo: {s.lastScore}</div>}
                      </div>
                    </div>
                  )}

                  <button onClick={() => setEditing(s)} className="rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-background hover:text-foreground" title="Correggi il check-in dell'atleta">
                    <Icon name="clipboard" size={16} />
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : a.id)} className="rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-background" title="Andamento 14 giorni">
                    <Icon name="chevron" size={16} className={isOpen ? "rotate-90 transition-transform" : "transition-transform"} />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-border bg-background/40 px-5 py-4">
                    <div className="mx-auto max-w-[640px]">
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-[12px] text-muted">
                        <span className="font-semibold text-foreground/80">Andamento readiness · 14 giorni</span>
                        {s.readinessScore != null && <span>oggi <b style={{ color: fm.color }}>{s.readinessScore}</b></span>}
                        {s.deltaVsPrev != null && <span className="inline-flex items-center gap-1">vs ieri <DeltaChip d={s.deltaVsPrev} sm /></span>}
                        <span>load settimana <b>{s.load.weekly.toLocaleString("it-IT")}</b> A.U.{s.load.spike && <span className="ml-1 text-warn">· picco</span>}</span>
                      </div>
                      <ReadinessChart points={s.history.map((h) => ({ date: h.date, score: h.score, flag: h.flag }))} height={190} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {editing && <EditModal state={editing} compiled={isCompiled(editing)} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </div>
  );
}

function DeltaChip({ d, sm }: { d: number; sm?: boolean }) {
  const color = d > 0 ? "var(--good)" : d < 0 ? "var(--bad)" : "var(--muted)";
  return <span className={`font-bold ${sm ? "text-[12px]" : "text-[13px]"}`} style={{ color }}>{d > 0 ? "▲ +" : d < 0 ? "▼ " : "— "}{d !== 0 ? Math.abs(d) : ""}</span>;
}

function FlagPill({ flag, n }: { flag: Flag; n: number }) {
  const fm = FLAG_META[flag];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ color: fm.color, backgroundColor: fm.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fm.color }} /> {n}
    </span>
  );
}

/** Mini-sparkline pulita (solo linea, colore per trend). */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="text-[11px] italic text-muted-2">storico insufficiente</div>;
  const W = 560, H = 38;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / span) * (H - 8) - 4;
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" L ");
  const up = points[points.length - 1] >= points[points.length - 2];
  const color = up ? "var(--good)" : "var(--bad)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden className="block">
      <path d={`M ${line} L ${x(points.length - 1)},${H} L ${x(0)},${H} Z`} fill={color} fillOpacity={0.08} />
      <path d={`M ${line}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---- Correzione staff (il check-in lo compila l'atleta) ---------------------
function EditModal({ state, compiled, onClose, onSave }: { state: ReadinessState; compiled: boolean; onClose: () => void; onSave: (athleteId: string) => void }) {
  const a = state.athlete;
  const init = useMemo(() => {
    const o: Record<ReItem, number> = { fatigue: 4, doms: 4, sleep_quality: 4, sleep_hours: 7.5, stress: 4, mood: 4 };
    if (state.entry) for (const q of RE_QUESTIONNAIRE) { const v = state.entry[q.key]; if (typeof v === "number") o[q.key] = v; }
    return o;
  }, [state]);
  const [vals, setVals] = useState<Record<ReItem, number>>(init);
  const [areas, setAreas] = useState<string[]>(state.entry?.doms_area ?? []);

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={`Correggi check-in · ${a.lastName} ${a.firstName}`} onClose={onClose} />
      <div className="overflow-y-auto p-6">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-dashed border-border bg-background/60 px-3.5 py-2.5 text-[12px] text-muted">
          <Icon name="warning" size={15} className="mt-0.5 shrink-0 text-amber-600" />
          Il check-in lo compila l&apos;atleta dalla sua app. Qui puoi solo <b className="mx-1">correggere</b> un dato o registrarlo per suo conto{compiled ? "" : " (oggi non risulta ancora compilato)"}.
        </div>

        <div className="space-y-4">
          {RE_QUESTIONNAIRE.map((q) => (
            <div key={q.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold"><span style={{ color: q.color }}><Icon name={q.icon} size={16} /></span> {q.label}</span>
                <span className="font-mono text-[15px] font-extrabold" style={{ color: q.color }}>{q.kind === "hours" ? `${vals[q.key].toFixed(1)}h` : vals[q.key]}</span>
              </div>
              {q.kind === "hours" ? (
                <input type="range" min={3.5} max={10} step={0.5} value={vals.sleep_hours} onChange={(e) => setVals((s) => ({ ...s, sleep_hours: Number(e.target.value) }))} className="w-full" style={{ accentColor: q.color }} />
              ) : (
                <>
                  <input type="range" min={1} max={7} step={1} value={vals[q.key]} onChange={(e) => setVals((s) => ({ ...s, [q.key]: Number(e.target.value) }))} className="w-full" style={{ accentColor: q.color }} />
                  <div className="mt-0.5 flex justify-between text-[10px] font-medium text-muted-2"><span>{q.anchors?.[0]}</span><span>{q.anchors?.[6]}</span></div>
                </>
              )}
              {q.key === "doms" && vals.doms <= RE_CONFIG.doms_area_trigger && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOMS_AREAS.map((ar) => (
                    <button key={ar} onClick={() => setAreas((p) => (p.includes(ar) ? p.filter((x) => x !== ar) : [...p, ar]))} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${areas.includes(ar) ? "brand-bg brand-on" : "border border-border text-muted hover:bg-background"}`}>{ar}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={() => onSave(a.id)} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Salva correzione</button>
        </div>
      </div>
    </Modal>
  );
}
