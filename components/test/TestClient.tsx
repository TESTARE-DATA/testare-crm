"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, PhysicalKpi, AthleteTestSession } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { SWC, TIER_META, tierOf } from "@/lib/perf";
import { DIM_META } from "@/lib/tests";
import { useLocalCollection, newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { putFile, deleteFile } from "@/lib/fileStore";
import { extractDateFromDataUrl } from "@/lib/fileDate";
import { parseTestReport, type ParsedReport } from "@/lib/testReport";
import { Icon } from "@/components/Icon";
import { PageHeader, StatCard, TierBadge } from "@/components/ui";
import { ImportReportModal } from "@/components/test/ImportReportModal";
import { type ReportFile, FileBtn, fmtMonth, cleanName } from "@/components/test/ReportArchive";

type Tab = "panoramica" | "ranking" | "evoluzione" | "archivio";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "panoramica", label: "Panoramica", icon: "dashboard" },
  { id: "ranking", label: "Ranking", icon: "trophy" },
  { id: "evoluzione", label: "Evoluzione", icon: "trend" },
  { id: "archivio", label: "Archivio file", icon: "upload" },
];

const COLS: { key: keyof PhysicalKpi | "pIndex"; label: string }[] = [
  { key: "forza", label: "Forza" },
  { key: "potenza", label: "Potenza" },
  { key: "reattivita", label: "Reattività" },
  { key: "simmetria", label: "Simmetrie" },
  { key: "pIndex", label: "P-Index" },
];

export function TestClient({ clientId, athletes, clientLogo, clientName, initialSessions }: { clientId: string; athletes: Athlete[]; clientLogo: string; clientName: string; initialSessions?: AthleteTestSession[] }) {
  const [tab, setTab] = useState<Tab>("panoramica");

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Area Performance" subtitle="Profilazione neuromuscolare — batteria TESTÀRE evidence-based (CEBM 1a–2b)" icon="bolt" />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "panoramica" && <Panoramica clientId={clientId} athletes={athletes} initialSessions={initialSessions} />}
      {tab === "ranking" && <Ranking clientId={clientId} athletes={athletes} />}
      {tab === "evoluzione" && <Evoluzione clientId={clientId} athletes={athletes} />}
      {tab === "archivio" && <Archivio clientId={clientId} athletes={athletes} clientLogo={clientLogo} clientName={clientName} />}
    </div>
  );
}

// ---- Panoramica: statistiche di squadra + distribuzione ---------------------
function Panoramica({ clientId, athletes, initialSessions }: { clientId: string; athletes: Athlete[]; initialSessions?: AthleteTestSession[] }) {
  const { items: sessions } = useDbCollection<AthleteTestSession>(`athlete-tests:${clientId}`, initialSessions);

  // Numeri "reali" dai report importati (collezione athlete-tests).
  const sessionCount = sessions.length;
  const testCount = sessions.reduce((s, x) => s + (x.measures?.length ?? 0), 0);
  const lastTest = sessions.map((s) => s.date).sort().pop() ?? null;

  // Numeri di profilo dalla rosa (sempre disponibili).
  const pAvg = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.pIndex, 0) / athletes.length) : 0;
  const dims: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];
  const dimAvg = dims.map((d) => ({ d, v: athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile[d], 0) / athletes.length) : 0 }));
  const leaders = [...athletes].sort((a, b) => b.profile.pIndex - a.profile.pIndex).slice(0, 5);

  const tiers = ["Elite", "Buono", "Adeguato", "Critico"] as const;
  const counts = tiers.map((t) => ({ t, n: athletes.filter((a) => tierOf(a.profile.pIndex) === t).length }));
  const maxN = Math.max(1, ...counts.map((c) => c.n));

  const fmtShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });

  return (
    <div className="space-y-5">
      {/* Cards di sintesi */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Atleti" value={athletes.length} hint="in rosa" icon="users" />
        <StatCard label="P-Index medio" value={`${pAvg}°`} hint={`su ${athletes.length} atleti`} icon="bolt" tone="brand" />
        <StatCard label="Ultimo test" value={<span className="text-2xl">{lastTest ? fmtShort(lastTest) : "—"}</span>} hint={lastTest ? "ultima sessione" : "nessuna sessione"} icon="calendar" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FeatureStat icon="dumbbell" label="Test somministrati" value={testCount.toLocaleString("it-IT")} tint="rose" hint="misure registrate nell'archivio" />
        <FeatureStat icon="layers" label="Sessioni di test" value={sessionCount.toLocaleString("it-IT")} tint="brand" hint="valutazioni importate" />
      </div>

      {/* Profilo dimensioni + Leaderboard */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Icon name="chart" size={15} className="brand-text" /> Profilo Dimensioni</h3>
            <span className="text-[11px] text-muted-2">Media squadra</span>
          </div>
          <div className="space-y-4">
            {dimAvg.map(({ d, v }) => (
              <div key={d}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: DIM_META[d].color }}>{DIM_META[d].label}</span>
                  <span className="text-xl font-extrabold" style={{ color: DIM_META[d].color }}>{v}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: DIM_META[d].color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold"><Icon name="trophy" size={15} className="brand-text" /> Leaderboard</h3>
            <span className="text-[11px] text-muted-2">Top P-Index</span>
          </div>
          <div className="space-y-1.5">
            {leaders.map((a, i) => (
              <Link key={a.id} href={`${sectionHref(clientId, "rosa")}/${a.id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${i === 0 ? "bg-amber-50 ring-1 ring-amber-200" : "hover:bg-background"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-amber-300 text-amber-900" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-background text-muted-2"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold uppercase leading-tight">{a.lastName} {a.firstName}</div>
                  <div className="text-[11px] text-muted-2">{tierOf(a.profile.pIndex)}</div>
                </div>
                <Ring value={a.profile.pIndex} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Distribuzione per fascia */}
      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Icon name="chart" size={15} className="brand-text" /> Distribuzione per fascia (P-Index)</h3>
        <div className="flex items-end justify-around gap-3" style={{ height: 200 }}>
          {counts.map(({ t, n }) => (
            <div key={t} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-lg font-bold">{n}</span>
              <div className="w-full rounded-t-lg" style={{ height: `${(n / maxN) * 140}px`, backgroundColor: TIER_META[t].color, minHeight: 4 }} />
              <span className="text-[11px] font-medium" style={{ color: TIER_META[t].color }}>{t}</span>
              <span className="text-[10px] text-muted-2">{TIER_META[t].range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Card di sintesi "grande" con numero in evidenza e tinta di accento. */
function FeatureStat({ icon, label, value, hint, tint }: { icon: string; label: string; value: string; hint: string; tint: "rose" | "brand" }) {
  const bg = tint === "rose" ? "linear-gradient(135deg, #fff1f2, #ffffff)" : "linear-gradient(135deg, var(--brand-soft), #ffffff)";
  const fg = tint === "rose" ? "#e11d48" : "var(--brand-primary)";
  return (
    <div className="card relative overflow-hidden p-5" style={{ background: bg }}>
      <Icon name={icon} size={120} className="pointer-events-none absolute -right-4 -bottom-6 opacity-[0.06]" />
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: fg }}>
        <Icon name={icon} size={16} /> {label}
      </div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight" style={{ color: fg }}>{value}</div>
      <div className="mt-1 text-[12px] text-muted">{hint}</div>
    </div>
  );
}

/** Anello percentuale (P-Index) per la leaderboard. */
function Ring({ value }: { value: number }) {
  const r = 15.5;
  const c = 2 * Math.PI * r;
  const color = TIER_META[tierOf(value)].color;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className="absolute text-[13px] font-extrabold">{value}</span>
    </div>
  );
}

// ---- Ranking (sortable) -----------------------------------------------------
function Ranking({ clientId, athletes }: { clientId: string; athletes: Athlete[] }) {
  const [sort, setSort] = useState<keyof PhysicalKpi | "pIndex">("pIndex");
  const rows = useMemo(() => [...athletes].sort((a, b) => b.profile[sort] - a.profile[sort]), [athletes, sort]);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
              <th className="px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Atleta</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-semibold">
                  <button onClick={() => setSort(c.key)} className={`inline-flex items-center gap-1 ${sort === c.key ? "brand-text" : "hover:text-foreground"}`}>
                    {c.label} <span className="text-[9px]">{sort === c.key ? "▼" : "⇅"}</span>
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 font-semibold">Tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                <td className="px-4 py-2.5 font-mono text-muted-2">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-semibold hover:underline">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></Link>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2.5">
                    <Cell value={a.profile[c.key]} highlight={c.key === sort} big={c.key === "pIndex"} />
                  </td>
                ))}
                <td className="px-4 py-2.5"><TierBadge tier={tierOf(a.profile.pIndex)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ value, highlight, big }: { value: number; highlight?: boolean; big?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: highlight || big ? "var(--brand-primary)" : "var(--muted-2)" }} />
      </div>
      <span className={`font-mono ${big ? "font-bold" : highlight ? "brand-text font-semibold" : "text-muted"}`}>{value}°</span>
    </div>
  );
}

// ---- Evoluzione -------------------------------------------------------------
function Evoluzione({ clientId, athletes }: { clientId: string; athletes: Athlete[] }) {
  const rows = useMemo(
    () => athletes.map((a) => ({ a, prev: a.profile.prev.pIndex, cur: a.profile.pIndex, d: a.profile.pIndex - a.profile.prev.pIndex })).sort((x, y) => y.d - x.d),
    [athletes],
  );
  const improved = rows.filter((r) => r.d >= SWC).length;
  const declined = rows.filter((r) => r.d <= -SWC).length;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.d)));

  // Evoluzione media di squadra per dimensione (prev → attuale).
  const dims: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];
  const dimEvo = dims.map((d) => {
    const cur = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile[d], 0) / athletes.length) : 0;
    const prev = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.prev[d], 0) / athletes.length) : 0;
    return { d, prev, cur, delta: cur - prev };
  });
  const teamPrev = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.prev.pIndex, 0) / athletes.length) : 0;
  const teamCur = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.pIndex, 0) / athletes.length) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <Mini label="Migliorati" value={improved} sub={`Δ ≥ +${SWC}`} color="var(--good)" />
        <Mini label="Stabili" value={rows.length - improved - declined} sub={`|Δ| < ${SWC}`} color="var(--muted)" />
        <Mini label="In calo" value={declined} sub={`Δ ≤ -${SWC}`} color="var(--bad)" />
        <div className="card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Media squadra</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{teamCur}°</span>
            <DeltaTag d={teamCur - teamPrev} />
          </div>
          <div className="text-[11px] text-muted-2">era {teamPrev}° · P-Index</div>
        </div>
      </div>

      {/* Evoluzione per dimensione */}
      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><Icon name="trend" size={15} className="brand-text" /> Evoluzione media di squadra per dimensione</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dimEvo.map(({ d, prev, cur, delta }) => (
            <div key={d} className="rounded-xl border border-border p-4">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: DIM_META[d].color }}>{DIM_META[d].label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">{cur}</span>
                <DeltaTag d={delta} />
              </div>
              <div className="mt-1 text-[11px] text-muted-2">era {prev}</div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-2">
                <span className="font-mono">{prev}</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, cur)}%`, backgroundColor: DIM_META[d].color }} />
                </div>
                <span className="font-mono font-semibold">{cur}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dettaglio per atleta */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Atleta</th>
                <th className="px-4 py-2.5 font-semibold">Precedente</th>
                <th className="px-4 py-2.5 font-semibold">Attuale</th>
                <th className="px-4 py-2.5 font-semibold">Δ</th>
                <th className="px-4 py-2.5 font-semibold">Lettura (SWC ±{SWC})</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, prev, cur, d }) => {
                const sig = Math.abs(d) >= SWC;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-2.5"><Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-medium hover:underline">{a.lastName}</Link></td>
                    <td className="px-4 py-2.5 font-mono text-muted">{prev}°</td>
                    <td className="px-4 py-2.5 font-mono font-semibold">{cur}°</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <DivergingBar d={d} max={maxAbs} />
                        <span className="font-mono font-bold" style={{ color: d > 0 ? "var(--good)" : d < 0 ? "var(--bad)" : "var(--muted)" }}>{d > 0 ? "+" : ""}{d}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px]">
                      {sig ? <span className="font-medium" style={{ color: d > 0 ? "var(--good)" : "var(--bad)" }}>oltre SWC · cambio reale</span> : <span className="text-muted-2">entro SWC · rumore test-retest</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-muted-2">Hopkins 2006: δ significativo se |Δ| &gt; 0.2 × SD ≈ {SWC} pts P-Index. Δ &gt; SWC → probabile cambio reale (ripetere per validare). Δ &lt; SWC → rumore, nessuna azione.</p>
    </div>
  );
}

function DeltaTag({ d }: { d: number }) {
  const color = d > 0 ? "var(--good)" : d < 0 ? "var(--bad)" : "var(--muted)";
  return <span className="text-[13px] font-bold" style={{ color }}>{d > 0 ? "▲ +" : d < 0 ? "▼ " : "— "}{d !== 0 ? Math.abs(d) : ""}</span>;
}

/** Barra divergente centrata: verso destra (verde) se positivo, sinistra (rosso) se negativo. */
function DivergingBar({ d, max }: { d: number; max: number }) {
  const w = (Math.abs(d) / max) * 50; // % di metà barra
  return (
    <div className="relative hidden h-1.5 w-16 rounded-full bg-background sm:block">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
      {d !== 0 && (
        <div
          className="absolute inset-y-0 rounded-full"
          style={d > 0 ? { left: "50%", width: `${w}%`, backgroundColor: "var(--good)" } : { right: "50%", width: `${w}%`, backgroundColor: "var(--bad)" }}
        />
      )}
    </div>
  );
}

function Mini({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-muted-2">{sub}</div>
    </div>
  );
}

// ---- Archivio file report (HTML/PDF inviati da TESTÀRE) ---------------------
const ANALYSIS_NAME = "Analisi della valutazione neuromuscolare";
// Esempi VARIATI per mostrare l'illuminazione: completo (HTML+PDF), solo PDF, solo HTML.
// I demo puntano a file reali in /public/reports così, cliccando, si apre davvero l'esempio.
const DEMO_HTML = "/reports/esempio-valutazione.html";
const DEMO_PDF = "/reports/esempio-valutazione.pdf";
const SEED_REPORTS: ReportFile[] = [
  { id: "seed-1", name: ANALYSIS_NAME, date: "2026-05-13", kind: "html", url: DEMO_HTML, demo: true },
  { id: "seed-1b", name: ANALYSIS_NAME, date: "2026-05-13", kind: "pdf", url: DEMO_PDF, demo: true },
  { id: "seed-2", name: ANALYSIS_NAME, date: "2026-01-20", kind: "pdf", url: DEMO_PDF, demo: true },
  { id: "seed-3", name: ANALYSIS_NAME, date: "2025-09-02", kind: "html", url: DEMO_HTML, demo: true },
];

function Archivio({ clientId, athletes, clientLogo, clientName }: { clientId: string; athletes: Athlete[]; clientLogo: string; clientName: string }) {
  const { items, add, remove } = useLocalCollection<ReportFile>(`test-reports:${clientId}`);
  const all = [...items, ...SEED_REPORTS].sort((a, b) => b.date.localeCompare(a.date));
  const [report, setReport] = useState<{ parsed: ParsedReport; fileName: string; html: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Archivia il file così com'è (PDF, o HTML non riconosciuto come report TESTÀRE).
  // Il contenuto va in IndexedDB (regge file grandi e persiste); in localStorage
  // solo i metadati. In caso di errore salvo comunque i metadati (tasto acceso ma
  // non apribile, con tooltip) invece di far sparire tutto.
  const archiveFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const date = extractDateFromDataUrl(url) ?? new Date().toISOString().slice(0, 10);
      const id = newId("rep");
      const kind: "html" | "pdf" = /\.pdf$/i.test(f.name) ? "pdf" : "html";
      const meta = { id, name: cleanName(f.name, ANALYSIS_NAME), date, kind };
      putFile(id, f)
        .then(() => add({ ...meta, hasFile: true }))
        .catch(() => add(meta));
    };
    reader.readAsDataURL(f);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (/\.html?$/i.test(f.name)) {
        // HTML: prova a leggerlo come report di valutazione neuromuscolare → estrazione dati.
        const reader = new FileReader();
        reader.onload = () => {
          const text = String(reader.result);
          const parsed = parseTestReport(text);
          if (parsed.ok && parsed.athletes.length) {
            // Conservo il contenuto HTML: alla conferma finisce in IndexedDB così
            // il report resta apribile dall'archivio (non solo un record di metadati).
            setReport({ parsed, fileName: f.name, html: text });
          } else archiveFile(f); // HTML non riconosciuto → archivia e basta
        };
        reader.readAsText(f);
      } else {
        archiveFile(f); // PDF: comportamento invariato
      }
    });
  };

  // A conferma importazione: registra una voce nell'archivio (metadati + blob HTML
  // in IndexedDB, così resta apribile) e mostra l'esito.
  const onImported = (count: number) => {
    if (report) {
      const id = newId("rep");
      const meta = { id, name: ANALYSIS_NAME, date: report.parsed.reportDate ?? new Date().toISOString().slice(0, 10), kind: "html" as const };
      const blob = new Blob([report.html], { type: "text/html;charset=utf-8" });
      putFile(id, blob).then(() => add({ ...meta, hasFile: true })).catch(() => add(meta));
    }
    setFlash(`Importati ${count} giocatori: valori salvati nello storico e nei radar.`);
    setReport(null);
    window.setTimeout(() => setFlash(null), 6000);
  };

  // raggruppa per (data + nome): un gruppo = una valutazione con i suoi formati
  const groups = new Map<string, ReportFile[]>();
  for (const r of all) {
    const k = `${r.date}__${r.name}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  return (
    <div>
      <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-medium text-muted transition-colors hover:border-[var(--brand-primary)] hover:text-foreground">
        <Icon name="upload" size={18} /> Carica un report (HTML o PDF) — dall&apos;HTML estraggo i dati di ogni giocatore
        <input type="file" accept=".html,.htm,application/pdf" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </label>
      <p className="mb-5 text-center text-[12px] text-muted-2">Carichi il report completo: i valori dei singoli atleti finiscono nello storico e nel radar di ciascuno, dopo la tua conferma.</p>

      {flash && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon name="link" size={16} /> {flash}
        </div>
      )}

      {report && <ImportReportModal clientId={clientId} seedAthletes={athletes} parsed={report.parsed} fileName={report.fileName} onClose={() => setReport(null)} onDone={onImported} />}

      <div className="space-y-3">
        {[...groups.entries()].map(([k, files]) => {
          const r = files[0];
          const html = files.find((f) => f.kind === "html");
          const pdf = files.find((f) => f.kind === "pdf");
          return (
            <div key={k} className="card brand-topline flex flex-wrap items-center gap-4 overflow-hidden p-4">
              {/* Stemma squadra */}
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border" style={{ backgroundColor: "var(--brand-soft)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clientLogo} alt={clientName} className="h-9 w-9 object-contain" />
              </span>

              <div className="min-w-48 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold leading-tight">{r.name}</span>
                  <span className="brand-soft-bg brand-text inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"><Icon name="calendar" size={11} /> {fmtMonth(r.date)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-2">
                  <span className="uppercase tracking-wide">Analisi a cura di</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logos/testare-logo.png" alt="TESTÀRE" className="h-[13px] w-auto" />
                  {r.demo && <span>· esempio</span>}
                </div>
              </div>

              {/* Tasti HTML / PDF: illuminato quello disponibile per questo file */}
              <div className="flex items-center gap-2">
                <FileBtn kind="html" file={html} />
                <FileBtn kind="pdf" file={pdf} />
                {!r.demo && <button onClick={() => files.forEach((f) => { remove(f.id); if (f.hasFile) deleteFile(f.id).catch(() => {}); })} className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-2 transition-colors hover:border-red-200 hover:text-red-600" title="Elimina"><span className="text-[13px]">✕</span></button>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] text-muted-2">Tutti i report dei test fisici inviati da TESTÀRE (HTML interattivo + PDF), in ordine di data. La data viene estratta automaticamente dal contenuto del file.</p>
    </div>
  );
}
