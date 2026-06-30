"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AthleteTestSession, FvPoint, FvProfile } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useDbCollection } from "@/lib/useDbCollection";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

function percColor(p: number | null): string {
  if (p == null) return "var(--muted-2)";
  if (p >= 67) return "var(--good)";
  if (p >= 34) return "var(--warn)";
  return "var(--bad)";
}

/**
 * Storico delle valutazioni neuromuscolari dell'atleta — alimentato dai report
 * importati nella sezione Test (collezione athlete-tests:<clientId>). Mostra ogni
 * sessione datata con i suoi test, valore e percentile.
 */
export function AthleteTestHistory({ clientId, athleteId, initial }: { clientId: string; athleteId: string; initial?: AthleteTestSession[] }) {
  const { items } = useDbCollection<AthleteTestSession>(`athlete-tests:${clientId}`, initial);
  const sessions = useMemo(
    () => items.filter((s) => s.athleteId === athleteId).sort((a, b) => b.date.localeCompare(a.date)),
    [items, athleteId],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  // La più recente è espansa di default.
  const currentId = sessions[0]?.id ?? null;
  const isOpen = (id: string) => (openId ? openId === id : id === currentId);

  return (
    <Panel
      title="Storico valutazioni neuromuscolari"
      className="brand-topline"
      action={<Link href={sectionHref(clientId, "test")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Test <Icon name="chevron" size={13} /></Link>}
    >
      {sessions.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted">
          <Icon name="upload" size={18} className="text-muted-2" />
          Nessuna valutazione importata. Carica un report nella sezione <Link href={sectionHref(clientId, "test")} className="brand-text mx-1 font-semibold hover:underline">Test</Link> e i dati di questo atleta compariranno qui.
        </div>
      ) : (
        <ol className="relative space-y-3 p-5">
          <span className="pointer-events-none absolute bottom-6 left-[26px] top-6 w-px bg-border" />
          {sessions.map((s, i) => {
            const open = isOpen(s.id);
            // Variazione F-V: sessione precedente (più vecchia) che ha il profilo.
            const prev = s.fv ? sessions.slice(i + 1).find((x) => x.fv) : undefined;
            return (
              <li key={s.id} className="relative flex gap-3 pl-1">
                <span className={`relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${i === 0 ? "brand-bg brand-on" : "bg-background text-muted-2"}`}>
                  <Icon name="stopwatch" size={15} />
                </span>
                <div className="flex-1 rounded-xl border border-border bg-surface">
                  <button onClick={() => setOpenId(open ? "__none__" : s.id)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold capitalize">{fmtDate(s.date)}</span>
                      {i === 0 && <span className="brand-soft-bg brand-text rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">ultima</span>}
                    </span>
                    <span className="flex items-center gap-2 text-[12px] text-muted">
                      {s.measures.length} test
                      <Icon name="chevron" size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-4 border-t border-border px-3.5 py-3">
                      {s.measures.length > 0 && (
                        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                          {s.measures.map((m) => (
                            <div key={m.name} className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="min-w-0 truncate text-muted">{m.name}</span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="font-mono font-semibold">{m.value}<span className="ml-0.5 text-[11px] font-normal text-muted-2">{m.unit}</span></span>
                                {m.percentile != null && (
                                  <span className="inline-flex h-5 min-w-[34px] items-center justify-center rounded-md px-1 text-[11px] font-bold text-white" style={{ backgroundColor: percColor(m.percentile) }}>{m.percentile}°</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {s.fv && <FvSection fv={s.fv} prev={prev?.fv} prevLabel={prev ? fmtShort(prev.date) : undefined} />}

                      {s.commento && (
                        <div className="rounded-lg border border-border bg-background p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2"><Icon name="sparkle" size={12} className="brand-text" /> Commento tecnico</div>
                          <p className="text-[12.5px] leading-relaxed text-foreground/85">{s.commento}</p>
                        </div>
                      )}
                      {s.note && (
                        <div className="rounded-lg border border-border bg-background p-3">
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-2">Note del preparatore</div>
                          <p className="text-[12.5px] leading-relaxed text-foreground/85">{s.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

// ---- Profilo Carico-Velocità (F-V) -----------------------------------------
function FvSection({ fv, prev, prevLabel }: { fv: FvProfile; prev?: FvProfile; prevLabel?: string }) {
  const slope = fv.slope;
  const delta = slope != null && prev?.slope != null ? Math.round((slope - prev.slope) * 1e4) / 1e4 : null;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2"><Icon name="trend" size={12} className="brand-text" /> Profilo Carico-Velocità</div>
        {slope != null && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-2">Pendenza</span>
            <span className="font-mono font-bold">{slope.toFixed(4)}</span>
            {delta != null && (
              <span className="font-mono font-semibold" style={{ color: delta === 0 ? "var(--muted-2)" : delta > 0 ? "var(--good)" : "var(--warn)" }} title={prevLabel ? `vs ${prevLabel}` : undefined}>
                {delta > 0 ? "▲ +" : delta < 0 ? "▼ " : ""}{delta !== 0 ? delta.toFixed(4) : "="}
              </span>
            )}
          </div>
        )}
      </div>
      <FvChart fv={fv} prev={prev} />
      {fv.profile && <p className="mt-2 text-[12px] text-foreground/80"><span className="font-semibold">Profilo:</span> {fv.profile}{prev && prevLabel ? <span className="text-muted-2"> · variazione rispetto al {prevLabel}</span> : null}</p>}
    </div>
  );
}

function FvChart({ fv, prev }: { fv: FvProfile; prev?: FvProfile }) {
  const all: FvPoint[] = [...fv.measured, ...fv.line, ...(fv.oneRm ? [fv.oneRm] : []), ...(prev?.line ?? [])];
  if (all.length < 2) return null;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  let xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xp = (xMax - xMin) * 0.06 || 1, yp = (yMax - yMin) * 0.08 || 0.1;
  xMin -= xp; xMax += xp; yMin = Math.max(0, yMin - yp); yMax += yp;
  const W = 380, H = 200, L = 44, R = 14, T = 12, B = 30;
  const sx = (x: number) => L + ((x - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const poly = (pts: FvPoint[]) => pts.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }} role="img" aria-label="Profilo Carico-Velocità">
      {/* assi */}
      <line x1={L} y1={T} x2={L} y2={H - B} stroke="var(--border)" strokeWidth={1} />
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--border)" strokeWidth={1} />
      {/* tick + etichette */}
      <text x={L} y={H - B + 16} textAnchor="start" fill="var(--muted-2)" style={{ fontSize: 9 }}>{Math.round(xMin)}</text>
      <text x={W - R} y={H - B + 16} textAnchor="end" fill="var(--muted-2)" style={{ fontSize: 9 }}>{Math.round(xMax)}</text>
      <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" fill="var(--muted-2)" style={{ fontSize: 9.5, fontWeight: 700 }}>CARICO (kg)</text>
      <text x={L - 6} y={sy(yMin) - 1} textAnchor="end" fill="var(--muted-2)" style={{ fontSize: 9 }}>{yMin.toFixed(1)}</text>
      <text x={L - 6} y={T + 8} textAnchor="end" fill="var(--muted-2)" style={{ fontSize: 9 }}>{yMax.toFixed(1)}</text>
      <text x={11} y={(T + H - B) / 2} textAnchor="middle" fill="var(--muted-2)" style={{ fontSize: 9.5, fontWeight: 700 }} transform={`rotate(-90 11 ${(T + H - B) / 2})`}>VELOCITÀ (m/s)</text>
      {/* retta precedente (variazione) */}
      {prev && prev.line.length >= 2 && <polyline points={poly(prev.line)} fill="none" stroke="var(--muted-2)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />}
      {/* retta corrente */}
      {fv.line.length >= 2 && <polyline points={poly(fv.line)} fill="none" stroke="var(--brand-primary)" strokeWidth={2.2} strokeLinecap="round" />}
      {/* punti misurati */}
      {fv.measured.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.6} fill="var(--brand-primary)" stroke="var(--surface)" strokeWidth={1} />)}
      {/* 1RM */}
      {fv.oneRm && <>
        <circle cx={sx(fv.oneRm.x)} cy={sy(fv.oneRm.y)} r={5} fill="var(--surface)" stroke="var(--bad)" strokeWidth={2} />
        <text x={sx(fv.oneRm.x)} y={sy(fv.oneRm.y) - 9} textAnchor="middle" fill="var(--bad)" style={{ fontSize: 9, fontWeight: 700 }}>1RM</text>
      </>}
      {/* legenda */}
      <g>
        <circle cx={W - R - 92} cy={T + 4} r={3.2} fill="var(--brand-primary)" /><text x={W - R - 85} y={T + 7} fill="var(--muted-2)" style={{ fontSize: 8.5 }}>misurati</text>
        {prev && <><line x1={W - R - 44} y1={T + 4} x2={W - R - 34} y2={T + 4} stroke="var(--muted-2)" strokeWidth={1.5} strokeDasharray="3 3" /><text x={W - R - 31} y={T + 7} fill="var(--muted-2)" style={{ fontSize: 8.5 }}>prec.</text></>}
      </g>
    </svg>
  );
}
