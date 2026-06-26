"use client";

import Image from "next/image";
import { useState } from "react";
import type { Athlete, PhysicalKpi } from "@/lib/types";
import { TIER_META } from "@/lib/perf";
import { neuroReport, type TestRow } from "@/lib/neuromuscolare";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { InteractiveRadar } from "@/components/InteractiveRadar";

const DIMC: Record<string, string> = { Forza: "#7c3aed", Potenza: "#e94f35", Reattività: "#0891b2", Mobilità: "#16a34a", Stabilità: "#c026d3" };
const pctColor = (p: number) => (p >= 75 ? "var(--good)" : p >= 50 ? "var(--elite)" : p >= 25 ? "var(--warn)" : "var(--bad)");
const fmt = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "2-digit" });

/** Bottone che apre il Report di valutazione neuromuscolare TESTÀRE dell'atleta. */
export function AthleteReport({ athlete, team }: { athlete: Athlete; team: PhysicalKpi; tests?: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="brand-bg brand-on inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-transform hover:scale-[1.03]">
        <Icon name="clipboard" size={14} /> Apri report
      </button>
      {open && <ReportModal athlete={athlete} team={team} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportModal({ athlete: a, team, onClose }: { athlete: Athlete; team: PhysicalKpi; onClose: () => void }) {
  const p = a.profile;
  const rep = neuroReport(a);
  const tierMeta = TIER_META[rep.tier as keyof typeof TIER_META];
  const lastDate = rep.trend[rep.trend.length - 1]?.date;

  return (
    <Modal onClose={onClose} size="xl">
      <div className="grad-line shrink-0" />
      {/* Intestazione */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={150} height={38} className="h-6 w-auto" />
          <span className="h-7 w-px bg-border" />
          <div>
            <div className="text-[15px] font-bold leading-tight">Valutazione neuromuscolare</div>
            <div className="text-[11px] text-muted">{lastDate ? `Sessione del ${fmt(lastDate)}` : "Report individuale"}</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-background">✕</button>
      </div>

      <div className="overflow-y-auto border-t border-border">
        {/* Anagrafica + P-Index */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-background px-6 py-3">
          <div>
            <div className="text-lg font-extrabold tracking-tight">{a.firstName} {a.lastName}</div>
            <div className="text-[12px] text-muted">{a.role} · #{a.shirtNumber} · {a.nationality}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">P-Index composito</div>
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-3xl font-extrabold leading-none" style={{ color: tierMeta.color }}>{p.pIndex}°</span>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: tierMeta.color, backgroundColor: tierMeta.bg }}>{rep.tier}</span>
            </div>
          </div>
        </div>

        {/* Profilo Atletico: radar + dimensioni */}
        <Section title="Profilo Atletico">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col items-center"><InteractiveRadar kpi={p} prev={p.prev} team={team} size={300} /></div>
            <div className="space-y-3 self-center">
              {rep.dims.map((d) => (
                <div key={d.dim}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-semibold">{d.dim}</span>
                    <span className="font-mono font-bold" style={{ color: pctColor(d.pct) }}>{d.pct}°</span>
                  </div>
                  <Scale pct={d.pct} color={DIMC[d.dim]} />
                </div>
              ))}
              <div className="mt-1 text-[11px] text-muted-2">Percentili 0–100° vs normativa Serie B.</div>
            </div>
          </div>
        </Section>

        {/* Trend Storico */}
        <Section title="Trend Storico" sub="Evoluzione del P-Index per sessione e contesto">
          <Trend rep={rep} />
        </Section>

        {/* Profilo Carico-Velocità */}
        <Section title="Profilo Carico-Velocità (F-V)">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-base font-bold">{rep.fv.profile}</div>
              <div className="mt-1 text-[13px] text-muted">{rep.fv.indication}</div>
            </div>
            <div className="flex gap-3">
              <Mini label="Pendenza" value={rep.fv.slope > 0 ? `+${rep.fv.slope}` : `${rep.fv.slope}`} />
              <Mini label="1RM stimato" value={`${rep.fv.est1RM} kg`} />
            </div>
          </div>
        </Section>

        {/* Dettaglio Test & Percentili */}
        <Section title="Dettaglio Test & Percentili">
          <div className="space-y-4">
            {rep.battery.map((grp) => grp.rows.length > 0 && (
              <div key={grp.dim}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: DIMC[grp.dim] }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DIMC[grp.dim] }} /> {grp.dim}
                </div>
                <div className="space-y-1.5">
                  {grp.rows.map((t) => <TestLine key={t.num} t={t} />)}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Analisi Simmetrie */}
        <Section title="Analisi delle Simmetrie" sub="Asimmetria bilaterale — soglia fisiologica 10%">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-2">
              {rep.symmetry.rows.map((s) => (
                <div key={s.test} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[13px] font-medium">{s.test}</span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-background">
                    <span className="absolute inset-y-0" style={{ left: "50%", width: 1, backgroundColor: "var(--border-strong)" }} />
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.asym * 4)}%`, backgroundColor: s.asym >= 10 ? "var(--bad)" : s.asym >= 6 ? "var(--warn)" : "var(--good)" }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[12px] font-mono">{s.asym}% {s.dominant !== "—" && <b className="text-muted-2">{s.dominant}</b>}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-2">Bias direzionale</div>
                <div className="mt-0.5 text-[13px] font-medium">{rep.symmetry.bias}</div>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--warn) 30%, transparent)", backgroundColor: "color-mix(in srgb, var(--warn) 7%, transparent)" }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"><Icon name="medical" size={11} /> Rischio infortunio</div>
                <div className="mt-0.5 text-[12px] leading-snug text-foreground/80">{rep.symmetry.risk}</div>
                <div className="mt-1.5 flex gap-3 text-[12px] font-mono"><span>KTW DX <b>{rep.symmetry.ktwDx}</b></span><span>KTW SX <b>{rep.symmetry.ktwSx}</b></span></div>
              </div>
            </div>
          </div>
        </Section>

        {/* Commento Tecnico */}
        <Section title="Commento Tecnico">
          <div className="rounded-xl border border-border bg-background p-4 text-[13px] leading-relaxed">{rep.comment}</div>
        </Section>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="text-[11px] text-muted-2">Report generato dalla piattaforma TESTÀRE · metodologia Season Report · normativa Serie B.</div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold hover:bg-background"><Icon name="upload" size={14} /> Stampa / PDF</button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border px-6 py-5">
      <div className="mb-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2">{title}</div>
        {sub && <div className="text-[11px] text-muted-2">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/** Barra a scala 0–25–50–75–100 con marcatore al percentile. */
function Scale({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-background">
      {[25, 50, 75].map((t) => <span key={t} className="absolute inset-y-0 w-px" style={{ left: `${t}%`, backgroundColor: "var(--border-strong)" }} />)}
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color ?? pctColor(pct) }} />
    </div>
  );
}

function TestLine({ t }: { t: TestRow }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="text-[13px] font-medium">{t.name}</span>
        {t.bilateral && t.dx != null && <span className="ml-2 font-mono text-[11px] text-muted-2">DX {t.dx} · SX {t.sx}{t.asym ? ` · Δ${t.asym}%` : ""}</span>}
      </span>
      <span className="w-24 shrink-0"><Scale pct={t.percentile} /></span>
      <span className="w-24 shrink-0 text-right font-mono text-[12px]"><b>{t.value}</b> <span className="text-muted-2">{t.unit}</span></span>
      <span className="w-9 shrink-0 text-right font-mono text-[12px] font-bold" style={{ color: pctColor(t.percentile) }}>{t.percentile}°</span>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function Trend({ rep }: { rep: ReturnType<typeof neuroReport> }) {
  const t = rep.trend;
  const W = 600, H = 90, pad = 8;
  const vals = t.map((s) => s.pIndex);
  const lo = Math.max(0, Math.min(...vals) - 8), hi = Math.min(100, Math.max(...vals) + 8);
  const x = (i: number) => pad + (i / Math.max(1, t.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const line = t.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.pIndex).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }} preserveAspectRatio="none">
        <path d={line} fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinejoin="round" />
        {t.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.pIndex)} r={i === t.length - 1 ? 4 : 2.5} fill={i === t.length - 1 ? "var(--brand-primary)" : "var(--surface)"} stroke="var(--brand-primary)" strokeWidth="2" />)}
      </svg>
      <div className="mt-1 flex justify-between gap-1 overflow-x-auto">
        {t.map((s) => (
          <div key={s.code} className="min-w-0 flex-1 text-center">
            <div className="font-mono text-[11px] font-bold">{s.pIndex}°</div>
            <div className="truncate text-[9px] text-muted-2">{fmt(s.date)}</div>
            <div className="truncate text-[9px] font-semibold text-muted">{s.context}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
