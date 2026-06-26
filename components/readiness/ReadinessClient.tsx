"use client";

import { useMemo, useState } from "react";
import type { Athlete as AthleteFull } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { usePhotos } from "@/lib/usePhotos";
import { useRoster } from "@/lib/useRoster";
import { WELLNESS, computeReadiness, readinessTier, PAIN_OPTIONS, SCALE_MIN, SCALE_MAX, type ReadinessEntry } from "@/lib/readiness-core";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { ProgressChart } from "@/components/programmazione/ProgressChart";

type Athlete = { id: string; name: string; first: string; last: string; role: string; shirt: number; status: string };
type Entry = { athleteId: string; date: string; score: number };

export function ReadinessClient({
  clientId,
  seed,
  entries,
}: {
  clientId: string;
  seed: AthleteFull[];
  entries: Entry[];
}) {
  const { items: submissions, add } = useLocalCollection<ReadinessEntry>(`readiness:${clientId}`);
  const { photos } = usePhotos(clientId);
  const { athletes: resolved } = useRoster(clientId, seed);
  const [compiling, setCompiling] = useState<Athlete | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Rosa EFFETTIVA (riflette aggiunte/modifiche/rimozioni) → righe readiness.
  const athletes: Athlete[] = useMemo(
    () => resolved.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, first: a.firstName, last: a.lastName, role: a.role, shirt: a.shirtNumber, status: a.status })),
    [resolved],
  );
  const ids = useMemo(() => new Set(athletes.map((a) => a.id)), [athletes]);

  const todayKey = useMemo(() => {
    let m = "";
    for (const e of entries) if (e.date > m) m = e.date;
    for (const s of submissions) if (s.date > m) m = s.date;
    return m || new Date().toISOString().slice(0, 10);
  }, [entries, submissions]);

  // Storico per atleta (seed) + override dalle compilazioni utente, SOLO rosa effettiva.
  const histories = useMemo(() => {
    const map = new Map<string, { date: string; score: number }[]>();
    for (const e of entries) {
      if (!ids.has(e.athleteId)) continue;
      if (!map.has(e.athleteId)) map.set(e.athleteId, []);
      map.get(e.athleteId)!.push({ date: e.date, score: e.score });
    }
    for (const s of submissions) {
      if (!ids.has(s.athleteId)) continue;
      const arr = map.get(s.athleteId) ?? [];
      const i = arr.findIndex((x) => x.date === s.date);
      if (i >= 0) arr[i] = { date: s.date, score: s.score };
      else arr.push({ date: s.date, score: s.score });
      map.set(s.athleteId, arr);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [entries, submissions, ids]);

  const todayOf = (id: string) => {
    const h = histories.get(id);
    return h && h.length ? h[h.length - 1].score : null;
  };

  const painsToday = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of submissions) if (s.date === todayKey && s.pains?.length && ids.has(s.athleteId)) map.set(s.athleteId, s.pains);
    return map;
  }, [submissions, todayKey, ids]);

  const rows = useMemo(
    () => athletes.map((a) => ({ a, today: todayOf(a.id) })).sort((x, y) => (x.today ?? 999) - (y.today ?? 999)),
    [athletes, histories], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Trend squadra ricalcolato dalla rosa effettiva (per giorno).
  const teamChart = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const arr of histories.values()) for (const e of arr) { if (!byDate.has(e.date)) byDate.set(e.date, []); byDate.get(e.date)!.push(e.score); }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, vals]) => ({ label: fmt(date), value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }));
  }, [histories]);

  const scored = rows.filter((r) => r.today != null) as { a: Athlete; today: number }[];
  const teamToday = teamChart.length ? teamChart[teamChart.length - 1].value : 0;
  const teamTier = readinessTier(teamToday);
  const watch = scored.filter((r) => r.today < 65);

  function saveQuestionnaire(athleteId: string, items: Record<string, number>, pains: string[]) {
    add({ id: newId("rd"), clientId, athleteId, date: todayKey, items, score: computeReadiness(items), pains });
    setCompiling(null);
  }

  return (
    <div className="space-y-5">
      {/* Squadra */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card brand-topline p-5 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Readiness squadra · ultimi {teamChart.length} giorni</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: teamTier.color, backgroundColor: teamTier.bg }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: teamTier.color }} /> {teamToday}% · {teamTier.level}
            </span>
          </div>
          <ProgressChart data={teamChart} unit="%" height={200} />
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon name="medical" size={16} className="text-warn" /> Da monitorare oggi
          </div>
          {watch.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nessun atleta sotto soglia. 👏</p>
          ) : (
            <ul className="space-y-1.5">
              {watch.map((r) => {
                const t = readinessTier(r.today);
                return (
                  <li key={r.a.id} className="flex items-center gap-2.5 rounded-lg bg-background p-2">
                    <Avatar firstName={r.a.first} lastName={r.a.last} photoUrl={photos[r.a.id]} size={28} />
                    <span className="flex-1 truncate text-[13px] font-medium">{r.a.last}</span>
                    <span className="text-sm font-bold" style={{ color: t.color }}>{r.today}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Atleti */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Readiness per atleta</h2>
          <span className="text-[12px] text-muted">ordinati per readiness</span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map(({ a, today }) => {
            const h = histories.get(a.id) ?? [];
            const t = today != null ? readinessTier(today) : null;
            const isOpen = expanded === a.id;
            return (
              <li key={a.id}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <Avatar firstName={a.first} lastName={a.last} photoUrl={photos[a.id]} shirtNumber={a.shirt} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <span>{a.role}</span>
                      {painsToday.get(a.id)?.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-700" title={p}>
                          <Icon name="medical" size={11} /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Sparkline points={h.map((x) => x.score)} />
                  {t ? (
                    <div className="w-16 text-right">
                      <div className="text-lg font-extrabold leading-none" style={{ color: t.color }}>{today}%</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-2">{t.level}</div>
                    </div>
                  ) : (
                    <div className="w-16 text-right text-muted-2">—</div>
                  )}
                  <button onClick={() => setCompiling(a)} className="brand-soft-bg brand-text rounded-lg px-2.5 py-1.5 text-[12px] font-semibold" title="Compila questionario">
                    Compila
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : a.id)} className="rounded-lg p-1.5 text-muted-2 transition-colors hover:bg-background" title="Andamento">
                    <Icon name="chevron" size={16} className={isOpen ? "rotate-90 transition-transform" : "transition-transform"} />
                  </button>
                </div>
                {isOpen && h.length >= 2 && (
                  <div className="border-t border-border bg-background/40 px-5 py-4">
                    <ProgressChart data={h.map((x) => ({ label: fmt(x.date), value: x.score }))} unit="%" height={170} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {compiling && <Questionnaire athlete={compiling} onClose={() => setCompiling(null)} onSave={saveQuestionnaire} />}
    </div>
  );
}

// ---- Check-in giornaliero ---------------------------------------------------
function Questionnaire({ athlete, onClose, onSave }: { athlete: Athlete; onClose: () => void; onSave: (id: string, items: Record<string, number>, pains: string[]) => void }) {
  const [items, setItems] = useState<Record<string, number>>(Object.fromEntries(WELLNESS.map((w) => [w.key, 3])));
  const [pains, setPains] = useState<string[]>([]);
  const score = computeReadiness(items);
  const tier = readinessTier(score);

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={`Check-in giornaliero · ${athlete.name}`} onClose={onClose} />
      <div className="overflow-y-auto p-6">
        <div className="mb-5 flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: tier.bg }}>
          <div>
            <div className="text-sm font-semibold">Readiness risultante</div>
            <div className="text-[11px] text-muted">valuta i tuoi parametri da {SCALE_MIN} a {SCALE_MAX}</div>
          </div>
          <span className="text-3xl font-extrabold" style={{ color: tier.color }}>{score}<span className="text-lg">%</span> <span className="ml-1 text-sm font-semibold">{tier.level}</span></span>
        </div>

        <div className="space-y-5">
          {WELLNESS.map((w) => (
            <div key={w.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span style={{ color: w.color }}><Icon name={w.icon} size={18} /></span> {w.label}
                </span>
                <span className="text-xl font-extrabold" style={{ color: w.color }}>{items[w.key]}</span>
              </div>
              <input
                type="range" min={SCALE_MIN} max={SCALE_MAX} step={1} value={items[w.key]}
                onChange={(e) => setItems((s) => ({ ...s, [w.key]: +e.target.value }))}
                className="w-full" style={{ accentColor: w.color }}
              />
              <div className="mt-0.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                <span>{w.low}</span><span>{w.high}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Salute specifica */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Salute Specifica <span className="font-medium text-muted-2">(Opzionale)</span></span>
            <button onClick={() => setPains((p) => [...p, ""])} className="rounded-full border border-border px-3 py-1 text-[12px] font-semibold transition-colors hover:bg-background">+ Aggiungi Dolore</button>
          </div>
          <p className="mt-1 text-[12px] text-muted">Hai dolori o fastidi particolari?</p>
          <div className="mt-2 space-y-2">
            {pains.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="inp flex-1" value={p} onChange={(e) => setPains((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}>
                  <option value="">Seleziona…</option>
                  {PAIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <button onClick={() => setPains((arr) => arr.filter((_, j) => j !== i))} className="rounded-lg p-2 text-muted-2 hover:text-bad" title="Rimuovi">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={() => onSave(athlete.id, items, pains.filter(Boolean))} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Registra Check-in</button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Sparkline --------------------------------------------------------------
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="hidden w-24 sm:block" />;
  const W = 96, H = 28;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => `${(i / (points.length - 1)) * W},${H - ((v - min) / span) * (H - 4) - 2}`)
    .join(" L ");
  const last = points[points.length - 1];
  const up = last >= points[0];
  return (
    <svg width={W} height={H} className="hidden shrink-0 sm:block" aria-hidden>
      <path d={`M ${d}`} fill="none" stroke={up ? "var(--good)" : "var(--bad)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
