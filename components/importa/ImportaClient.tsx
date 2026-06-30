"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ImportJob, ImportStatus, Measurement } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { dbUpsertMany } from "@/lib/db/actions";
import { sectionHref } from "@/lib/nav";
import {
  IMPORT_TYPES, getType, parseCsv, analyze, buildGps, buildMeasurements, buildAthletes,
  buildTemplateCsv, importableRows, todayISO, type AthleteLite, type ImportKind, type PreviewRow,
} from "@/lib/importer";
import { Icon } from "@/components/Icon";
import { Badge, Panel } from "@/components/ui";

type Step = "choose" | "upload" | "review" | "done";
const STATUS_TONE: Record<ImportStatus, "green" | "amber" | "red"> = { completato: "green", "in corso": "amber", errore: "red" };
const TARGET_LABEL: Record<ImportKind, string> = { gps: "Carico", misura: "Misurazioni", rosa: "Rosa" };
const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const STEPS: { key: Step; label: string }[] = [
  { key: "choose", label: "Scegli" },
  { key: "upload", label: "Carica" },
  { key: "review", label: "Controlla" },
  { key: "done", label: "Fatto" },
];

export function ImportaClient({ clientId, seedJobs, roster }: { clientId: string; seedJobs: ImportJob[]; roster: AthleteLite[] }) {
  const { items: jobItems, add: addJob } = useLocalCollection<ImportJob>(`imports:${clientId}`);
  const { add: addMeasurement } = useLocalCollection<Measurement>(`misurazioni:${clientId}`);

  const [step, setStep] = useState<Step>("choose");
  const [kind, setKind] = useState<ImportKind | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = kind ? getType(kind) : null;
  const unit = (n: number) => (t ? (n === 1 ? t.unitOne : t.unitLabel) : "");
  const rosterById = useMemo(() => new Map(roster.map((a) => [a.id, a])), [roster]);
  const rosterSorted = useMemo(() => [...roster].sort((a, b) => a.shirtNumber - b.shirtNumber), [roster]);
  const jobs = useMemo(() => [...jobItems, ...seedJobs].sort((a, b) => b.date.localeCompare(a.date)), [jobItems, seedJobs]);

  const reset = () => { setStep("choose"); setKind(null); setRows([]); setFileName(""); setDoneCount(0); };
  const goUpload = (k: ImportKind) => { setKind(k); setRows([]); setFileName(""); setStep("upload"); };

  async function handleFile(file: File) {
    if (!kind) return;
    setFileName(file.name);
    const text = await file.text();
    setRows(analyze(kind, parseCsv(text), roster));
    setStep("review");
  }
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

  const downloadTemplate = () => {
    if (!kind || typeof document === "undefined") return;
    const blob = new Blob(["﻿" + buildTemplateCsv(kind)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = getType(kind).templateName; a.click();
    URL.revokeObjectURL(url);
  };

  // Abbinamento manuale dell'atleta su una riga (per gps/misura non riconosciuti).
  const setRowAthlete = (index: number, athleteId: string) => setRows((rs) => rs.map((r) => {
    if (r.index !== index) return r;
    const id = athleteId || null;
    const status: PreviewRow["status"] = !r.dataValid ? "error" : id ? "ok" : "error";
    const message = !r.dataValid ? r.message : id ? undefined : "Atleta non riconosciuto — abbinalo.";
    return { ...r, athleteId: id, needsAthlete: !id, status, message };
  }));

  const counts = useMemo(() => {
    const ok = rows.filter((r) => r.status === "ok").length;
    const warn = rows.filter((r) => r.status === "warn").length;
    const error = rows.filter((r) => r.status === "error").length;
    const importable = importableRows(rows).filter((r) => kind === "rosa" || !!r.athleteId).length;
    return { ok, warn, error, importable, total: rows.length };
  }, [rows, kind]);

  async function confirmImport() {
    if (!kind || !t || counts.importable === 0 || busy) return;
    setBusy(true);
    let count = 0;
    let status: ImportStatus = "completato";
    try {
      if (kind === "gps") { const recs = buildGps(rows, clientId); await dbUpsertMany(`gps:${clientId}`, recs); count = recs.length; }
      else if (kind === "misura") { const ms = buildMeasurements(rows, clientId); ms.forEach(addMeasurement); count = ms.length; }
      else { const ath = buildAthletes(rows, clientId); await dbUpsertMany(`athletes:${clientId}`, ath); count = ath.length; }
    } catch { status = "errore"; }
    addJob({ id: newId(`${clientId}-imp`), clientId, source: `${t.label} · ${fileName}`, target: TARGET_LABEL[kind], date: todayISO(), rows: count, status });
    setDoneCount(count);
    setBusy(false);
    setStep("done");
  }

  return (
    <div className="fade-up">
      {/* Indicatore passi */}
      <Stepper step={step} />

      {step === "choose" && (
        <>
          <h2 className="mb-1 mt-2 text-lg font-bold">Cosa vuoi caricare?</h2>
          <p className="mb-4 text-sm text-muted">Scegli il tipo di dato. Ti guido passo passo: i dati finiranno automaticamente nelle sezioni giuste.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {IMPORT_TYPES.map((ty) => (
              <button key={ty.kind} onClick={() => goUpload(ty.kind)} className="card card-hover sheen group flex flex-col items-start p-5 text-left">
                <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name={ty.icon} size={24} /></span>
                <div className="mt-3 text-base font-bold">{ty.label}</div>
                <p className="mt-1 flex-1 text-[13px] text-muted">{ty.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-muted-2"><Icon name="link" size={13} className="brand-text" /> Va in: {ty.lands}</span>
                <span className="brand-text mt-2 inline-flex items-center gap-1 text-[13px] font-semibold">Inizia <Icon name="chevron" size={14} className="transition-transform group-hover:translate-x-0.5" /></span>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-muted-2">Importazioni recenti</h3>
            <JobsList jobs={jobs} />
          </div>
        </>
      )}

      {step === "upload" && t && (
        <div className="mt-2">
          <BackBtn onClick={() => setStep("choose")} label="Cambia tipo" />
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl"><Icon name={t.icon} size={22} /></span>
            <div className="flex-1">
              <div className="text-base font-bold">{t.label}</div>
              <div className="text-[13px] text-muted">{t.blurb}</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft p-4">
            <div className="flex items-start gap-2.5 text-[13px]">
              <Icon name="sparkle" size={18} className="brand-text mt-0.5 shrink-0" />
              <span>Non sei sicuro del formato? <b>Scarica il modello</b>, compilalo con Excel e ricaricalo. Una riga per ogni {t.unitOne}.</span>
            </div>
            <button onClick={downloadTemplate} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--brand-primary)] px-3.5 py-2 text-sm font-semibold brand-text hover:bg-surface">
              <Icon name="upload" size={15} className="rotate-180" /> Scarica il modello
            </button>
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${dragOver ? "border-[var(--brand-primary)] bg-brand-soft" : "border-border hover:border-foreground/30 hover:bg-background"}`}
          >
            <span className="brand-soft-bg brand-text flex h-14 w-14 items-center justify-center rounded-2xl"><Icon name="upload" size={28} /></span>
            <div className="mt-1 text-base font-semibold">Trascina qui il file CSV</div>
            <div className="text-[13px] text-muted">oppure <span className="brand-text font-semibold">scegli dal computer</span> · formato .csv (anche da Excel)</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={onPick} />
          </label>
        </div>
      )}

      {step === "review" && t && (
        <div className="mt-2">
          <BackBtn onClick={() => setStep("upload")} label="Carica un altro file" />
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
            <Icon name="clipboard" size={18} className="brand-text" />
            <span className="text-sm font-semibold">{fileName}</span>
            <span className="text-[13px] text-muted">· {counts.total} righe lette</span>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-[13px]">
              <Count tone="var(--good)" n={counts.ok} label="pronte" />
              {counts.warn > 0 && <Count tone="var(--warn)" n={counts.warn} label="da rivedere" />}
              {counts.error > 0 && <Count tone="var(--bad)" n={counts.error} label="da sistemare" />}
            </div>
          </div>

          {counts.total === 0 ? (
            <div className="card p-10 text-center text-sm text-muted">Il file non contiene righe leggibili. Controlla di aver usato il modello e riprova.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="max-h-[460px] divide-y divide-border overflow-y-auto">
                {rows.map((r) => (
                  <RowItem
                    key={r.index} row={r} kind={t.kind} roster={rosterSorted} rosterById={rosterById}
                    onAthlete={(id) => setRowAthlete(r.index, id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur">
            <div className="text-sm">
              {counts.importable > 0
                ? <>Aggiungo <b className="brand-text">{counts.importable}</b> {unit(counts.importable)} a <b>{t.lands.split(",")[0]}</b>{counts.error > 0 ? ` · ${counts.error === 1 ? "1 riga sarà saltata" : `${counts.error} righe saranno saltate`}` : ""}</>
                : <span className="text-muted">Nessuna riga importabile: sistema gli abbinamenti o ricarica il file.</span>}
            </div>
            <button onClick={confirmImport} disabled={busy || counts.importable === 0} className="brand-bg brand-on flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm disabled:opacity-40">
              {busy ? "Importazione…" : <>Conferma e importa <Icon name="chevron" size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {step === "done" && t && (
        <div className="mt-2">
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Icon name="link" size={32} /></span>
            <h2 className="text-xl font-bold">Importazione completata</h2>
            <p className="max-w-md text-sm text-muted">
              {doneCount > 0
                ? <>Ho aggiunto <b className="text-foreground">{doneCount} {unit(doneCount)}</b>. {doneCount === 1 ? "La trovi" : "Li trovi"} già in <b>{t.lands}</b>.</>
                : <>Nessun dato importato. Controlla il file e riprova.</>}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {doneCount > 0 && (
                <Link href={sectionHref(clientId, t.href)} className="brand-bg brand-on flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm">
                  <Icon name={t.icon} size={16} /> Vai a {t.label.split("·")[0].trim()}
                </Link>
              )}
              <button onClick={reset} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-background">Importa altri dati</button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-2">Importazioni recenti</h3>
            <JobsList jobs={jobs} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- pezzi di UI ------------------------------------------------------------
function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="mb-6 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${i < idx ? "bg-emerald-500 text-white" : i === idx ? "brand-bg brand-on" : "bg-background text-muted-2"}`}>
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={`text-[13px] font-semibold ${i === idx ? "text-foreground" : "text-muted-2"}`}>{s.label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
        </div>
      ))}
    </div>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
      <Icon name="arrowLeft" size={15} /> {label}
    </button>
  );
}

function Count({ tone, n, label }: { tone: string; n: number; label: string }) {
  return <span className="inline-flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} /><b className="tnum">{n}</b> <span className="text-muted">{label}</span></span>;
}

const STATUS_DOT: Record<PreviewRow["status"], string> = { ok: "var(--good)", warn: "var(--warn)", error: "var(--bad)" };

function RowItem({ row, kind, roster, rosterById, onAthlete }: {
  row: PreviewRow; kind: ImportKind; roster: AthleteLite[]; rosterById: Map<string, AthleteLite>; onAthlete: (id: string) => void;
}) {
  const matched = row.athleteId ? rosterById.get(row.athleteId) : undefined;
  return (
    <div className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${row.status === "error" ? "bg-red-50/40" : ""}`}>
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0" style={{ backgroundColor: STATUS_DOT[row.status] }} title={row.status} />

      {/* Atleta */}
      <div className="w-full sm:w-56 sm:shrink-0">
        {kind === "rosa" ? (
          <span className="text-sm font-semibold">{row.athleteLabel}</span>
        ) : matched ? (
          <span className="text-sm font-semibold">#{matched.shirtNumber} {matched.lastName}</span>
        ) : (
          <select value="" onChange={(e) => onAthlete(e.target.value)} className="inp h-8 py-0 text-[13px]" aria-label="Abbina atleta">
            <option value="">⚠ Abbina «{row.athleteLabel}»…</option>
            {roster.map((a) => <option key={a.id} value={a.id}>#{a.shirtNumber} {a.lastName} {a.firstName}</option>)}
          </select>
        )}
      </div>

      {/* Celle dati */}
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {row.cells.map((c) => (
          <span key={c.label} className="text-[12px] text-muted"><span className="text-muted-2">{c.label}:</span> <b className="font-medium text-foreground">{c.value}</b></span>
        ))}
      </div>

      {row.message && <span className="text-[11px] font-medium sm:w-48 sm:shrink-0 sm:text-right" style={{ color: STATUS_DOT[row.status] }}>{row.message}</span>}
    </div>
  );
}

function JobsList({ jobs }: { jobs: ImportJob[] }) {
  if (jobs.length === 0) return <div className="card p-6 text-center text-sm text-muted">Nessuna importazione ancora.</div>;
  return (
    <Panel title="Storico importazioni">
      <ul className="divide-y divide-border">
        {jobs.map((j) => (
          <li key={j.id} className="flex items-center gap-3 px-4 py-3">
            <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg"><Icon name="upload" size={16} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{j.source}</div>
              <div className="text-[12px] text-muted">→ {j.target} · {j.rows.toLocaleString("it-IT")} righe · {fmtDate(j.date)}</div>
            </div>
            <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
