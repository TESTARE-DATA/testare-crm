"use client";

// ============================================================================
// Letteratura · Prognosi — riferimento clinico EBM per lo staff medico.
// Il medico cerca un infortunio → scheda con RACCOMANDAZIONE di rientro in
// testata (criteri / protocollo a tappe) + BENCHMARK osservato come riferimento,
// fonti e livello di evidenza. Dati in lib/prognosis.ts.
// ============================================================================

import { useMemo, useState } from "react";
import {
  CATEGORY_ICON, PROGNOSIS, type PrognosisEntry, REINJURY_WINDOW,
  RTP_FRAMING, type Source, type Tier, TIER_META,
} from "@/lib/prognosis";
import { Icon } from "@/components/Icon";

const CATEGORIES = ["Tutte", "Muscolare", "Legamentosa", "Articolare", "Commozione"] as const;

export function InjuryPrognosis() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Tutte");
  const [openId, setOpenId] = useState<string | null>(PROGNOSIS[0]?.id ?? null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PROGNOSIS.filter((p) => cat === "Tutte" || p.category === cat).filter(
      (p) => !needle || p.name.toLowerCase().includes(needle) || p.region.toLowerCase().includes(needle),
    );
  }, [q, cat]);

  return (
    <div>
      {/* Cornice metodologica */}
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-amber-800">
          <Icon name="medical" size={16} /> Come leggere questa sezione
        </div>
        <ul className="space-y-1">
          {RTP_FRAMING.map((t, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-amber-900/90">
              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-amber-500" />{t}
            </li>
          ))}
        </ul>
      </div>

      {/* Ricerca + filtri */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca infortunio (es. lesione muscolare)…"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${cat === c ? "brand-bg border-transparent text-white" : "border-border hover:bg-background"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Schede */}
      <div className="space-y-3">
        {list.map((p) => <Card key={p.id} entry={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />)}
        {!list.length && <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">Nessun infortunio corrisponde alla ricerca.</p>}
      </div>

      {/* Legenda livelli di evidenza */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 text-[11.5px]">
        <span className="font-semibold text-muted-2">Livello di evidenza:</span>
        {(Object.keys(TIER_META) as Tier[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: TIER_META[t].color }} />{TIER_META[t].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TierPill({ tier }: { tier: Tier }) {
  const m = TIER_META[tier];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, borderColor: m.color, background: `color-mix(in srgb, ${m.color} 9%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />{m.short}
    </span>
  );
}

function SourceLine({ s }: { s: Source }) {
  return (
    <li className="flex gap-1.5 text-[11.5px] leading-snug text-muted">
      <Icon name="link" size={12} className="mt-[3px] shrink-0 text-muted-2" />
      <span><span className="font-medium text-foreground/80">{s.label}</span> · {s.year} · {s.kind}{s.ref ? <span className="text-muted-2"> · {s.ref}</span> : null}</span>
    </li>
  );
}

function Card({ entry: p, open, onToggle }: { entry: PrognosisEntry; open: boolean; onToggle: () => void }) {
  return (
    <div className={`card overflow-hidden ${open ? "ring-1 ring-[var(--brand-primary)]/30" : ""}`}>
      {/* Intestazione cliccabile */}
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-background">
        <span className="brand-soft-bg brand-text flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icon name={CATEGORY_ICON[p.category]} size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-bold">{p.name}</h3>
            <span className="text-[11px] text-muted-2">{p.region}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span className="font-mono font-semibold text-foreground/80">{p.benchmark.headline}</span>
            <span className="text-muted-2">rientro osservato</span>
            <TierPill tier={p.recommendation.tier} />
          </div>
        </div>
        <Icon name="chevron" size={18} className={`shrink-0 text-muted-2 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            {/* RACCOMANDAZIONI — testata */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-[13px] font-bold"><Icon name="target" size={15} className="brand-text" /> Raccomandazioni di rientro</h4>
                <TierPill tier={p.recommendation.tier} />
              </div>
              <p className="mb-3 text-[12.5px] text-muted">{p.recommendation.approach}</p>

              {p.recommendation.minTime && (
                <div className="brand-soft-bg brand-text mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold">
                  <Icon name="stopwatch" size={14} /> {p.recommendation.minTime}
                </div>
              )}

              <ul className="space-y-1.5">
                {p.recommendation.criteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                    <Icon name="trend" size={14} className="mt-[2px] shrink-0" style={{ color: "var(--good)" }} />{c}
                  </li>
                ))}
              </ul>

              {p.recommendation.protocol && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Protocollo a tappe</div>
                  <ol className="space-y-1">
                    {p.recommendation.protocol.map((s, i) => (
                      <li key={i} className="flex gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px]">
                        <span className="brand-text font-bold">{s.stage}</span>
                        <span className="text-muted">— {s.detail}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {p.recommendation.qualitativeOnly && (
                <p className="mt-2 text-[11.5px] italic text-muted-2">Nessuna soglia numerica validata: criteri qualitativi.</p>
              )}

              <ul className="mt-3 space-y-1 border-t border-border pt-2">
                {p.recommendation.sources.map((s, i) => <SourceLine key={i} s={s} />)}
              </ul>
            </div>

            {/* COSA ASPETTARSI — benchmark */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-[13px] font-bold"><Icon name="calendar" size={15} className="text-muted" /> Cosa aspettarsi</h4>
                <TierPill tier={p.benchmark.tier} />
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="font-mono text-2xl font-extrabold tracking-tight">{p.benchmark.headline}</div>
                {p.benchmark.sub && <div className="mt-0.5 text-[12px] text-muted">{p.benchmark.sub}</div>}
                <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: "var(--warn)" }}>Tempo osservato · non un target</div>

                {p.benchmark.byGrade && (
                  <table className="mt-3 w-full text-[12px]">
                    <tbody>
                      {p.benchmark.byGrade.map((g, i) => (
                        <tr key={i} className="border-t border-border first:border-0">
                          <td className="py-1 pr-2 text-muted">{g.grade}{g.note ? <span className="text-muted-2"> · {g.note}</span> : null}</td>
                          <td className="py-1 text-right font-mono font-semibold">{g.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {p.benchmark.note && <p className="mt-2 text-[11px] leading-snug text-muted-2">{p.benchmark.note}</p>}
              </div>
              <ul className="mt-2 space-y-1"><SourceLine s={p.benchmark.source} /></ul>

              {p.frequency && (
                <p className="mt-2 flex gap-1.5 text-[11.5px] text-muted"><Icon name="users" size={13} className="mt-[2px] shrink-0 text-muted-2" />{p.frequency}</p>
              )}
            </div>
          </div>

          {/* Classificazione */}
          {p.classification && (
            <div className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-muted">
              <span className="font-semibold text-foreground/80">Classificazione · </span>{p.classification}
            </div>
          )}

          {/* Finestra re-infortunio */}
          <div className="mt-3 flex gap-2 rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: "color-mix(in srgb, var(--warn) 35%, transparent)", background: "color-mix(in srgb, var(--warn) 7%, transparent)" }}>
            <Icon name="bolt" size={14} className="mt-[2px] shrink-0" style={{ color: "var(--warn)" }} />
            <span><span className="font-semibold">Finestra di re-infortunio · </span><span className="text-muted">{REINJURY_WINDOW}</span></span>
          </div>

          {/* Caveat */}
          {p.caveats.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Avvertenze</div>
              <ul className="space-y-1">
                {p.caveats.map((c, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-snug text-muted"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-muted-2" />{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
