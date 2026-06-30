"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, PhysicalKpi } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { SWC, TIER_META, tierOf } from "@/lib/perf";
import { BATTERY, BATTERY_DIM, DIM_META } from "@/lib/tests";
import { useLocalCollection, newId } from "@/lib/store";
import { extractDateFromDataUrl } from "@/lib/fileDate";
import { parseTestReport, type ParsedReport } from "@/lib/testReport";
import { Icon } from "@/components/Icon";
import { PageHeader, TierBadge } from "@/components/ui";
import { ImportReportModal } from "@/components/test/ImportReportModal";

type Tab = "ranking" | "distribuzione" | "batteria" | "evoluzione" | "archivio";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "ranking", label: "Ranking", icon: "trophy" },
  { id: "distribuzione", label: "Distribuzione", icon: "chart" },
  { id: "batteria", label: "Batteria test", icon: "stopwatch" },
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

export function TestClient({ clientId, athletes, clientLogo, clientName }: { clientId: string; athletes: Athlete[]; clientLogo: string; clientName: string }) {
  const [tab, setTab] = useState<Tab>("ranking");

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Test" subtitle="Profilazione neuromuscolare — batteria TESTÀRE evidence-based (CEBM 1a–2b)" icon="stopwatch" />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "ranking" && <Ranking clientId={clientId} athletes={athletes} />}
      {tab === "distribuzione" && <Distribuzione athletes={athletes} />}
      {tab === "batteria" && <Batteria />}
      {tab === "evoluzione" && <Evoluzione clientId={clientId} athletes={athletes} />}
      {tab === "archivio" && <Archivio clientId={clientId} athletes={athletes} clientLogo={clientLogo} clientName={clientName} />}
    </div>
  );
}

// ---- Archivio file report (HTML/PDF inviati da TESTÀRE) ---------------------
const ANALYSIS_NAME = "Analisi della valutazione neuromuscolare";
interface ReportFile { id: string; name: string; date: string; kind: "html" | "pdf"; url?: string; demo?: boolean }
// Esempi VARIATI per mostrare l'illuminazione: completo (HTML+PDF), solo PDF, solo HTML.
const SEED_REPORTS: ReportFile[] = [
  { id: "seed-1", name: ANALYSIS_NAME, date: "2026-05-13", kind: "html", demo: true },
  { id: "seed-1b", name: ANALYSIS_NAME, date: "2026-05-13", kind: "pdf", demo: true },
  { id: "seed-2", name: ANALYSIS_NAME, date: "2026-01-20", kind: "pdf", demo: true },
  { id: "seed-3", name: ANALYSIS_NAME, date: "2025-09-02", kind: "html", demo: true },
];

/** Nome pulito dal filename (senza estensione/date/separatori); fallback al nome standard. */
function cleanName(filename: string): string {
  const base = filename.replace(/\.(html?|pdf)$/i, "")
    .replace(/\b\d{1,2}[/.\-_]\d{1,2}[/.\-_]20\d{2}\b/g, "")
    .replace(/\b20\d{2}[/.\-_]\d{1,2}[/.\-_]\d{1,2}\b/g, "")
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base.length >= 3 ? base : ANALYSIS_NAME;
}

function Archivio({ clientId, athletes, clientLogo, clientName }: { clientId: string; athletes: Athlete[]; clientLogo: string; clientName: string }) {
  const { items, add, remove } = useLocalCollection<ReportFile>(`test-reports:${clientId}`);
  const all = [...items, ...SEED_REPORTS].sort((a, b) => b.date.localeCompare(a.date));
  const [report, setReport] = useState<{ parsed: ParsedReport; fileName: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Archivia il file così com'è (PDF, o HTML non riconosciuto come report TESTÀRE).
  const archiveFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const date = extractDateFromDataUrl(url) ?? new Date().toISOString().slice(0, 10);
      try { add({ id: newId("rep"), name: cleanName(f.name), date, kind: /\.pdf$/i.test(f.name) ? "pdf" : "html", url }); }
      catch { add({ id: newId("rep"), name: cleanName(f.name), date, kind: /\.pdf$/i.test(f.name) ? "pdf" : "html" }); }
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
          const parsed = parseTestReport(String(reader.result));
          if (parsed.ok && parsed.athletes.length) setReport({ parsed, fileName: f.name });
          else archiveFile(f); // HTML non riconosciuto → archivia e basta
        };
        reader.readAsText(f);
      } else {
        archiveFile(f); // PDF: comportamento invariato
      }
    });
  };

  // A conferma importazione: registra una voce nell'archivio (metadati; il file
  // completo non entra in localStorage per dimensione) e mostra l'esito.
  const onImported = (count: number) => {
    if (report) add({ id: newId("rep"), name: ANALYSIS_NAME, date: report.parsed.reportDate ?? new Date().toISOString().slice(0, 10), kind: "html" });
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
                {!r.demo && <button onClick={() => files.forEach((f) => remove(f.id))} className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-2 transition-colors hover:border-red-200 hover:text-red-600" title="Elimina"><span className="text-[13px]">✕</span></button>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] text-muted-2">Tutti i report dei test fisici inviati da TESTÀRE (HTML interattivo + PDF), in ordine di data. La data viene estratta automaticamente dal contenuto del file.</p>
    </div>
  );
}

function FileBtn({ kind, file }: { kind: "html" | "pdf"; file?: ReportFile }) {
  const label = kind.toUpperCase();
  const icon = kind === "pdf" ? "clipboard" : "live";
  if (!file) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[13px] font-semibold text-muted-2 opacity-50" title={`Nessun file ${label}`}>
        <Icon name={icon} size={14} /> {label}
      </span>
    );
  }
  if (file.url) {
    return (
      <a href={file.url} target="_blank" rel="noopener" download={`${file.name}.${kind}`} className="brand-bg brand-on flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-transform hover:scale-[1.03]">
        <Icon name={icon} size={14} /> {label}
      </a>
    );
  }
  // esempio (senza file reale): illuminato ma non apribile
  return (
    <span className="brand-soft-bg brand-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold" title="File di esempio — carica il file reale per aprirlo">
      <Icon name={icon} size={14} /> {label}
    </span>
  );
}

function fmtMonth(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
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

// ---- Distribuzione ----------------------------------------------------------
function Distribuzione({ athletes }: { athletes: Athlete[] }) {
  const tiers = ["Elite", "Buono", "Adeguato", "Critico"] as const;
  const counts = tiers.map((t) => ({ t, n: athletes.filter((a) => tierOf(a.profile.pIndex) === t).length }));
  const maxN = Math.max(1, ...counts.map((c) => c.n));
  const dims: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];
  const dimAvg = dims.map((d) => ({ d, v: Math.round(athletes.reduce((s, a) => s + a.profile[d], 0) / athletes.length) }));
  const pAvg = Math.round(athletes.reduce((s, a) => s + a.profile.pIndex, 0) / athletes.length);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold">Distribuzione per fascia (P-Index)</h3>
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

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">Media squadra per dimensione</h3>
          <span className="brand-text text-2xl font-extrabold">{pAvg}° <span className="text-[11px] font-medium text-muted">P-Index</span></span>
        </div>
        <div className="space-y-4">
          {dimAvg.map(({ d, v }) => (
            <div key={d}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="font-medium" style={{ color: DIM_META[d].color }}>{DIM_META[d].label}</span>
                <span className="font-mono font-bold">{v}°</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: DIM_META[d].color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Batteria (protocollo reale TESTÀRE per il calcio) ----------------------
function Batteria() {
  const dims = [...new Set(BATTERY.map((t) => t.dim))];
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-bold">Batteria completa test neuromuscolare per il calcio</h3>
          <p className="mt-0.5 text-[12px] text-muted">{BATTERY.length} test · protocollo TESTÀRE</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dims.map((d) => (
            <span key={d} className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: BATTERY_DIM[d].color, backgroundColor: BATTERY_DIM[d].bg }}>
              {d} <span className="opacity-70">{BATTERY.filter((t) => t.dim === d).length}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
              <th className="px-5 py-2.5 font-semibold">#</th>
              <th className="py-2.5 font-semibold">Test</th>
              <th className="px-3 py-2.5 font-semibold">Unità</th>
              <th className="px-3 py-2.5 font-semibold">Dimensione</th>
              <th className="px-5 py-2.5 font-semibold">Bilaterale</th>
            </tr>
          </thead>
          <tbody>
            {BATTERY.map((t) => (
              <tr key={t.num} className="border-b border-border last:border-0 transition-colors hover:bg-background">
                <td className="px-5 py-3 text-muted-2">{t.num}</td>
                <td className="py-3 font-semibold">{t.name}</td>
                <td className="px-3 py-3 text-muted">{t.unit || "—"}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: BATTERY_DIM[t.dim].color, backgroundColor: BATTERY_DIM[t.dim].bg }}>{t.dim}</span>
                </td>
                <td className="px-5 py-3">{t.bilateral ? <span className="font-semibold text-foreground/80">DX/SX</span> : <span className="text-muted-2">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-5 py-3 text-[11px] text-muted-2">
        I test bilaterali (DX/SX) misurano entrambi gli arti per il calcolo delle asimmetrie. Batteria definita da TESTÀRE per il calcio.
      </p>
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

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Mini label="Migliorati" value={improved} sub={`Δ ≥ +${SWC}`} color="var(--good)" />
        <Mini label="Stabili" value={rows.length - improved - declined} sub={`|Δ| < ${SWC}`} color="var(--muted)" />
        <Mini label="In calo" value={declined} sub={`Δ ≤ -${SWC}`} color="var(--bad)" />
      </div>
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
                      <span className="font-mono font-bold" style={{ color: d > 0 ? "var(--good)" : d < 0 ? "var(--bad)" : "var(--muted)" }}>{d > 0 ? "▲ +" : d < 0 ? "▼ " : "— "}{d !== 0 ? d : ""}</span>
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
      <p className="mt-3 text-[11px] text-muted-2">Hopkins 2006: δ significativo se |Δ| &gt; 0.2 × SD ≈ {SWC} pts P-Index. Δ &gt; SWC → probabile cambio reale (ripetere per validare). Δ &lt; SWC → rumore, nessuna azione.</p>
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
