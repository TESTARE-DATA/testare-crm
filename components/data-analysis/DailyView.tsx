"use client";

// ============================================================================
// Vista giornaliera dell'allenamento — condivisa da Carico, Cardio e GPS.
// selettore giornata → KPI squadra → drill-down (squadra/reparto) → tabella
// atleti ordinabile → click atleta → scheda seduta con baseline 7/28g + squadra
// + pianificato (carico) + flag automatici.  Vedi lib/dataAnalysis.ts.
// ============================================================================

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { GpsRecord, PlayerRole, WorkAssignment } from "@/lib/types";
import {
  AREA_CONFIG, type AreaKey, baseline, type Flag, flagsFor, formatMetric,
  getMetric, mean, pctDelta, sessionDays, series,
} from "@/lib/dataAnalysis";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Panel, StatCard } from "@/components/ui";

export interface AthleteLite {
  id: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  shirtNumber: number;
}

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];
const ROLE_SHORT: Record<PlayerRole, string> = { Portiere: "POR", Difensore: "DIF", Centrocampista: "CEN", Attaccante: "ATT" };
const WD = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const weekday = (iso: string) => WD[new Date(iso + "T00:00:00").getDay()];
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function DailyView({ clientId, area, athletes, records }: {
  clientId: string; area: AreaKey; athletes: AthleteLite[]; records: GpsRecord[];
}) {
  const cfg = AREA_CONFIG[area];
  const primary = getMetric(cfg, cfg.primary)!;

  const days = useMemo(() => sessionDays(records), [records]);
  const athById = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  const [date, setDate] = useState(days.length ? days[days.length - 1].date : "");
  const [role, setRole] = useState<PlayerRole | "all">("all");
  const [sortKey, setSortKey] = useState(cfg.primary);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openId, setOpenId] = useState<string | null>(null);

  // Pianificato (solo carico): somma estLoad delle assegnazioni per atleta+giorno.
  const { items: assignments } = useLocalCollection<WorkAssignment>(`assignments:${clientId}`);
  const plannedMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!cfg.planned) return m;
    for (const w of assignments) for (const id of w.athleteIds) {
      const k = `${id}|${w.date}`;
      m.set(k, (m.get(k) ?? 0) + (w.estLoad || 0));
    }
    return m;
  }, [assignments, cfg.planned]);

  // Record della giornata selezionata (con atleta risolto), filtrati per reparto.
  const dayRows = useMemo(() => {
    return records
      .filter((g) => g.date === date)
      .map((g) => ({ g, a: athById.get(g.athleteId) }))
      .filter((r): r is { g: GpsRecord; a: AthleteLite } => !!r.a)
      .filter((r) => role === "all" || r.a.role === role);
  }, [records, date, athById, role]);

  const rolesPresent = useMemo(() => {
    const present = new Set(records.filter((g) => g.date === date).map((g) => athById.get(g.athleteId)?.role).filter(Boolean));
    return ROLES.filter((r) => present.has(r));
  }, [records, date, athById]);

  // Media di SQUADRA (intera giornata, indipendente dal filtro reparto): è il
  // riferimento etichettato "Squadra" nella scheda seduta e nei flag "vs squadra",
  // quindi non deve restringersi al reparto selezionato (altrimenti l'etichetta
  // direbbe "squadra" mostrando in realtà la media del reparto).
  const teamMeanByKey = useMemo(() => {
    const allDay = records.filter((g) => g.date === date);
    const out: Record<string, number> = {};
    for (const m of cfg.metrics) out[m.key] = mean(allDay.map((g) => m.get(g)));
    return out;
  }, [records, date, cfg.metrics]);

  const sorted = useMemo(() => {
    const rows = [...dayRows];
    rows.sort((x, y) => {
      let cmp: number;
      if (sortKey === "name") cmp = x.a.lastName.localeCompare(y.a.lastName);
      else { const m = getMetric(cfg, sortKey)!; cmp = m.get(x.g) - m.get(y.g); }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [dayRows, sortKey, sortDir, cfg]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  // Distribuzione del metric primario nel gruppo (per la striscia min·media·max).
  const dist = useMemo(() => {
    const vals = dayRows.map((r) => primary.get(r.g));
    if (!vals.length) return null;
    return { min: Math.min(...vals), max: Math.max(...vals), mean: mean(vals) };
  }, [dayRows, primary]);

  if (!days.length) {
    return <Panel title={`${cfg.title} · vista giornaliera`}><p className="px-4 py-6 text-sm text-muted">Nessuna seduta registrata. Importa i dati dalla sezione <Link href={sectionHref(clientId, "importa-dati")} className="brand-text font-semibold hover:underline">Importa Dati</Link>.</p></Panel>;
  }

  const selDay = days.find((d) => d.date === date);
  const maxPrimary = Math.max(1, ...dayRows.map((r) => primary.get(r.g)));

  return (
    <div className="mb-8">
      {/* SELETTORE GIORNATA */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Giornata</span>
        {days.map((d) => {
          const on = d.date === date;
          return (
            <button key={d.date} onClick={() => { setDate(d.date); setOpenId(null); }}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-center transition ${on ? "brand-bg border-transparent text-white shadow-sm" : "border-border bg-card hover:bg-background"}`}>
              <div className="text-[11px] font-semibold leading-tight">{weekday(d.date)} {dm(d.date)}</div>
              <div className={`text-[10px] leading-tight ${on ? "text-white/80" : d.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{d.isMatch ? "GARA" : `${d.count} atleti`}</div>
            </button>
          );
        })}
      </div>

      {/* DRILL-DOWN: squadra → reparto */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Vista</span>
        <button onClick={() => setRole("all")} className={`rounded-full border px-3 py-1 text-[13px] font-medium transition ${role === "all" ? "brand-bg border-transparent text-white" : "border-border hover:bg-background"}`}>Tutta la squadra</button>
        {rolesPresent.map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`rounded-full border px-3 py-1 text-[13px] font-medium transition ${role === r ? "brand-bg border-transparent text-white" : "border-border hover:bg-background"}`}>{r}</button>
        ))}
        {selDay?.isMatch && <span className="ml-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[12px] font-semibold text-red-700 border border-red-200">Giornata gara</span>}
      </div>

      {/* KPI SQUADRA */}
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cfg.teamCards.map((c) => {
          let value: string | number;
          if (c.key === "count") value = dayRows.length;
          else {
            const m = getMetric(cfg, c.key)!;
            const vals = dayRows.map((x) => m.get(x.g));
            const v = !vals.length ? 0 : c.agg === "sum" ? vals.reduce((s, n) => s + n, 0) : c.agg === "max" ? Math.max(...vals) : mean(vals);
            value = formatMetric(m, v);
          }
          return <StatCard key={c.key} label={c.label} value={value} hint={`${weekday(date)} ${dm(date)}${role === "all" ? "" : ` · ${role}`}`} icon={c.icon} tone={c.tone} />;
        })}
      </div>

      {/* TABELLA ATLETI ORDINABILE */}
      <Panel title={`Atleti · ${role === "all" ? "squadra" : role}`} action={dist ? (
        <span className="text-[11px] text-muted-2">{primary.short}: min {formatMetric(primary, dist.min)} · media {formatMetric(primary, dist.mean)} · max {formatMetric(primary, dist.max)}</span>
      ) : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <Th label="Atleta" col="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="px-4" />
                {cfg.metrics.map((m) => <Th key={m.key} label={m.short} col={m.key} sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />)}
                <th className="px-3 py-2.5 font-semibold text-right">Stato</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ g, a }) => {
                const today = primary.get(g);
                const b7 = baseline(records, a.id, primary.get, date, 7).mean;
                const flags = flagsFor(cfg, today, b7, teamMeanByKey[cfg.primary]);
                const open = openId === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr onClick={() => setOpenId(open ? null : a.id)} className={`cursor-pointer border-b border-border last:border-0 hover:bg-background ${open ? "bg-background" : ""}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Icon name="chevron" size={14} className={`text-muted-2 transition-transform ${open ? "rotate-90" : ""}`} />
                          <span className="brand-soft-bg brand-text inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold">{a.shirtNumber}</span>
                          <span className="font-medium">{a.lastName}</span>
                          <span className="hidden text-[11px] text-muted-2 sm:inline">{ROLE_SHORT[a.role]}</span>
                        </div>
                      </td>
                      {cfg.metrics.map((m) => {
                        const isPrim = m.key === cfg.primary;
                        return (
                          <td key={m.key} className="px-3 py-2.5">
                            {isPrim ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-background"><div className="brand-bg h-full" style={{ width: `${(m.get(g) / maxPrimary) * 100}%` }} /></div>
                                <span className="font-mono font-semibold">{formatMetric(m, m.get(g))}</span>
                              </div>
                            ) : <span className="font-mono text-muted">{formatMetric(m, m.get(g))}</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right">
                        {flags.length ? <FlagDots flags={flags} /> : <span className="text-muted-2">—</span>}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border bg-background">
                        <td colSpan={cfg.metrics.length + 2} className="px-4 py-4">
                          <SessionDetail area={area} athlete={a} clientId={clientId} records={records} date={date}
                            rec={g} teamMean={teamMeanByKey} planned={plannedMap.get(`${a.id}|${date}`) ?? null} flags={flags} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!sorted.length && <tr><td colSpan={cfg.metrics.length + 2} className="px-4 py-6 text-center text-sm text-muted">Nessun atleta in questa vista.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-2">{cfg.note}</p>
      </Panel>
    </div>
  );
}

// ---- Intestazione di colonna ordinabile ------------------------------------
function Th({ label, col, sortKey, sortDir, onClick, className = "" }: { label: string; col: string; sortKey: string; sortDir: "asc" | "desc"; onClick: (c: string) => void; className?: string }) {
  const on = sortKey === col;
  return (
    <th className={`py-2.5 font-semibold ${className || "px-3"}`}>
      <button onClick={() => onClick(col)} className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-foreground ${on ? "text-foreground" : ""}`}>
        {label}<span className={`text-[9px] ${on ? "opacity-100" : "opacity-30"}`}>{on ? (sortDir === "asc" ? "▲" : "▼") : "▼"}</span>
      </button>
    </th>
  );
}

const FLAG_COLOR: Record<string, string> = { warn: "var(--warn)", info: "var(--brand-primary)", good: "var(--good)" };
function FlagDots({ flags }: { flags: Flag[] }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={flags.map((f) => f.text).join(" · ")}>
      {flags.some((f) => f.tone === "warn") && <Icon name="bolt" size={14} style={{ color: "var(--warn)" }} />}
      {flags.map((f, i) => <span key={i} className="h-2 w-2 rounded-full" style={{ background: FLAG_COLOR[f.tone] }} />)}
    </span>
  );
}

// ---- Scheda seduta del singolo atleta --------------------------------------
function SessionDetail({ area, athlete, clientId, records, date, rec, teamMean, planned, flags }: {
  area: AreaKey; athlete: AthleteLite; clientId: string; records: GpsRecord[]; date: string;
  rec: GpsRecord; teamMean: Record<string, number>; planned: number | null; flags: Flag[];
}) {
  const cfg = AREA_CONFIG[area];
  const primary = getMetric(cfg, cfg.primary)!;
  const today = primary.get(rec);
  const b7 = baseline(records, athlete.id, primary.get, date, 7);
  const b28 = baseline(records, athlete.id, primary.get, date, 28);
  const teamM = teamMean[cfg.primary];
  const hist = series(records, athlete.id, primary.get);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      {/* Confronto baseline + pianificato sul metric primario */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold"><Icon name={cfg.icon} size={16} className="brand-text" /> {primary.label}</h4>
          <Link href={`${sectionHref(clientId, "rosa")}/${athlete.id}`} className="brand-text text-[12px] font-semibold hover:underline">Apri scheda atleta →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RefBox label="Oggi" value={formatMetric(primary, today)} strong />
          <RefBox label="Media 7g" value={b7.n ? formatMetric(primary, b7.mean) : "—"} delta={b7.n ? pctDelta(today, b7.mean) : null} load={primary.load} sub={b7.n ? `${b7.n} sedute` : "no dati"} />
          <RefBox label="Media 28g" value={b28.n ? formatMetric(primary, b28.mean) : "—"} delta={b28.n ? pctDelta(today, b28.mean) : null} load={primary.load} sub={b28.n ? `${b28.n} sedute` : "no dati"} />
          <RefBox label="Squadra" value={teamM ? formatMetric(primary, teamM) : "—"} delta={teamM ? pctDelta(today, teamM) : null} load={primary.load} sub="giornata" />
        </div>

        {cfg.planned && (
          <div className="mt-3 rounded-xl border border-border bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-semibold text-muted-2"><Icon name="target" size={13} /> Pianificato vs svolto</span>
              {planned != null ? <span className="font-mono">{Math.round(today).toLocaleString("it-IT")} / {Math.round(planned).toLocaleString("it-IT")} AU</span> : <span className="text-muted-2">nessuna assegnazione</span>}
            </div>
            {planned != null && planned > 0 ? (
              <>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-background">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-muted-2/30" style={{ width: "100%" }} />
                  <div className="brand-bg absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (today / planned) * 100)}%` }} />
                </div>
                <div className="mt-1 text-right text-[11px] font-semibold" style={{ color: aderColor(Math.round((today / planned) * 100)) }}>{Math.round((today / planned) * 100)}% di aderenza</div>
              </>
            ) : <p className="text-[11px] text-muted-2">Assegna la seduta dal <Link href={sectionHref(clientId, "calendario")} className="brand-text font-semibold hover:underline">Calendario</Link> per confrontare previsto e svolto.</p>}
          </div>
        )}

        {flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {flags.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium" style={{ borderColor: FLAG_COLOR[f.tone], color: FLAG_COLOR[f.tone], background: `color-mix(in srgb, ${FLAG_COLOR[f.tone]} 8%, transparent)` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: FLAG_COLOR[f.tone] }} />{f.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trend personale + dettaglio metriche secondarie */}
      <div>
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Andamento {primary.short} · ultime sedute</h4>
        <TrendChart points={hist} selected={date} fmt={(v) => formatMetric(primary, v)} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cfg.metrics.filter((m) => m.key !== cfg.primary).map((m) => {
            const tv = m.get(rec);
            const mb = baseline(records, athlete.id, m.get, date, 7).mean;
            const d = pctDelta(tv, mb);
            return (
              <div key={m.key} className="rounded-lg border border-border bg-card px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-2">{m.short}</div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm font-semibold">{formatMetric(m, tv)}</span>
                  {d != null && Math.abs(d) >= 8 && <span className="text-[11px] font-semibold" style={{ color: deltaColor(d, m.load) }}>{d > 0 ? "+" : ""}{d}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RefBox({ label, value, delta, load, sub, strong }: { label: string; value: string; delta?: number | null; load?: boolean; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${strong ? "brand-soft-bg border-transparent" : "border-border bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className={`font-mono font-bold ${strong ? "brand-text text-lg" : "text-base"}`}>{value}</div>
      {delta != null ? (
        <div className="text-[11px] font-semibold" style={{ color: deltaColor(delta, !!load) }}>{delta > 0 ? "+" : ""}{delta}% vs {label.toLowerCase()}</div>
      ) : sub ? <div className="text-[10px] text-muted-2">{sub}</div> : null}
    </div>
  );
}

function deltaColor(delta: number, load: boolean): string {
  if (Math.abs(delta) < 15) return "var(--muted)";
  if (!load) return "var(--muted)";
  return delta > 0 ? "var(--warn)" : "var(--good)";
}
function aderColor(p: number): string {
  return p >= 90 && p <= 110 ? "var(--good)" : p < 75 || p > 125 ? "var(--warn)" : "var(--muted)";
}

// ---- Mini grafico di andamento personale -----------------------------------
function TrendChart({ points, selected, fmt }: { points: { date: string; v: number }[]; selected: string; fmt: (v: number) => string }) {
  if (points.length < 2) return <div className="flex h-[120px] items-center justify-center rounded-xl border border-border bg-card text-[12px] text-muted-2">Storico insufficiente</div>;
  const w = 380, h = 120, pad = 8;
  const max = Math.max(...points.map((p) => p.v)), min = Math.min(...points.map((p) => p.v));
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (h - 2 * pad);
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ");
  const area = `${x(0)},${h - pad} ${line} ${x(points.length - 1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-xl border border-border bg-card" style={{ height: 120 }}>
      <defs><linearGradient id="dvfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" /></linearGradient></defs>
      <polygon points={area} fill="url(#dvfill)" />
      <polyline points={line} fill="none" stroke="var(--brand-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const on = p.date === selected;
        return <g key={p.date}>
          <circle cx={x(i)} cy={y(p.v)} r={on ? 4.5 : 2.5} fill={on ? "var(--brand-primary)" : "var(--card)"} stroke="var(--brand-primary)" strokeWidth={on ? 0 : 1.6} />
          {on && <text x={x(i)} y={y(p.v) - 9} textAnchor="middle" className="fill-current text-[10px] font-bold" style={{ color: "var(--brand-primary)" }}>{fmt(p.v)}</text>}
        </g>;
      })}
    </svg>
  );
}
