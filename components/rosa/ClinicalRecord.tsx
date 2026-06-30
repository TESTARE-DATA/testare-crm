"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, CalendarEvent, InjurySeverity, MedicalClosure, MedicalRecord } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useLocalCollection } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { effectivePhase, type MedicalPhaseOverride } from "@/lib/medical-flow";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { Panel } from "@/components/ui";
import { InjuryTimeline } from "@/components/rosa/InjuryTimeline";

const REF_TODAY = "2026-06-19";
const TRAINING_TYPES = new Set(["campo", "palestra", "recupero"]);

/** Sedute saltate per un episodio: frequenza settimanale del calendario × giorni di stop. */
function missedFor(daysOut: number, tpw: number, mpw: number) {
  const w = daysOut / 7;
  return { trainings: Math.round(w * tpw), matches: Math.round(w * mpw) };
}
const daysBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));
function episodeDays(m: MedicalRecord): number {
  if (m.daysOut != null) return m.daysOut;
  const end = m.returnedAt ?? m.expectedReturn ?? REF_TODAY;
  return daysBetween(m.date, end);
}

const PHASE_STEPS = ["acuta", "subacuta", "riatletizzazione", "return to play", "conclusa"] as const;
const SEVERITY_META: Record<InjurySeverity, { color: string; label: string }> = {
  lieve: { color: "var(--elite)", label: "Lieve" },
  moderato: { color: "var(--warn)", label: "Moderato" },
  grave: { color: "var(--bad)", label: "Grave" },
};
const TYPE_ICON: Record<string, string> = { infortunio: "medical", sovraccarico: "load", malattia: "pulse", controllo: "clipboard" };

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—");

/**
 * Cartella clinica dell'atleta: storico infortuni "di sempre" con referto
 * apribile in un clic. Collegata all'Area Medica: stessa sorgente DB dei record
 * (`medical:<clientId>`), inclusi gli avanzamenti di fase (`medical-phase`) e le
 * chiusure (`medical-closed`) decise nel Diario riabilitativo.
 */
export function ClinicalRecord({
  clientId,
  clientName,
  athlete,
  seedMedical,
  seedEvents,
  initialMedical,
  initialClosures,
  initialPhase,
}: {
  clientId: string;
  clientName: string;
  athlete: Athlete;
  seedMedical: MedicalRecord[];
  seedEvents: CalendarEvent[];
  initialMedical?: MedicalRecord[];
  initialClosures?: MedicalClosure[];
  initialPhase?: MedicalPhaseOverride[];
}) {
  const { items: local } = useDbCollection<MedicalRecord>(`medical:${clientId}`, initialMedical);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`, initialClosures);
  const { items: phaseOv } = useDbCollection<MedicalPhaseOverride>(`medical-phase:${clientId}`, initialPhase);
  const { items: localEvents } = useLocalCollection<CalendarEvent>(`events:${clientId}`);
  const [referto, setReferto] = useState<MedicalRecord | null>(null);

  const records = useMemo(() => {
    const closureMap = new Map(closures.map((c) => [c.id, c]));
    // Applica la fase EFFETTIVA (override dal Diario) e marca come conclusi i casi
    // chiusi, così la cartella riflette lo stato reale gestito in Area Medica.
    const all = [...seedMedical, ...local]
      .filter((m) => m.athleteId === athlete.id)
      .map((m) => {
        const cl = closureMap.get(m.id);
        if (cl || m.phase === "conclusa") return { ...m, phase: "conclusa" as const, returnedAt: m.returnedAt ?? cl?.closedAt };
        const phase = effectivePhase(m, phaseOv);
        return phase === m.phase ? m : { ...m, phase };
      });
    const rank = (m: MedicalRecord) => (m.phase === "conclusa" ? 1 : 0);
    return all.sort((a, b) => rank(a) - rank(b) || b.date.localeCompare(a.date));
  }, [seedMedical, local, closures, phaseOv, athlete.id]);

  // Frequenza settimanale di allenamenti/partite ricavata dal CALENDARIO.
  const freq = useMemo(() => {
    const events = [...seedEvents, ...localEvents];
    if (events.length === 0) return { tpw: 0, mpw: 0 };
    const trainings = events.filter((e) => TRAINING_TYPES.has(e.sessionType)).length;
    const matches = events.filter((e) => e.sessionType === "partita").length;
    const dates = events.map((e) => e.date).sort();
    const span = daysBetween(dates[0], dates[dates.length - 1]) + 1;
    const weeks = Math.max(1, span / 7);
    return { tpw: trainings / weeks, mpw: matches / weeks };
  }, [seedEvents, localEvents]);

  const active = records.filter((m) => m.phase !== "conclusa");
  const totalDaysOut = records.reduce((s, m) => s + episodeDays(m), 0);
  const missedTotal = records.reduce((acc, m) => {
    const mm = missedFor(episodeDays(m), freq.tpw, freq.mpw);
    return { trainings: acc.trainings + mm.trainings, matches: acc.matches + mm.matches };
  }, { trainings: 0, matches: 0 });

  return (
    <Panel
      title="Cartella clinica"
      className="brand-topline"
      action={<Link href={sectionHref(clientId, "area-medica")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Area Medica <Icon name="chevron" size={13} /></Link>}
    >
      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-3 border-b border-border p-5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Episodi totali" value={String(records.length)} tone="var(--foreground)" />
        <Stat label="In corso" value={String(active.length)} tone={active.length ? "var(--bad)" : "var(--good)"} />
        <Stat label="Giorni di stop" value={String(totalDaysOut)} sub="storico" tone="var(--foreground)" />
        <Stat label="Allenamenti saltati" value={`~${missedTotal.trainings}`} sub="per infortunio" tone="var(--warn)" />
        <Stat label="Partite saltate" value={`~${missedTotal.matches}`} sub="per infortunio" tone="var(--bad)" />
      </div>

      {/* Timeline stagionale */}
      {records.length > 0 && <InjuryTimeline records={records} today={REF_TODAY} />}

      {records.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted">
          <Icon name="sparkle" size={18} className="text-good" /> Nessun episodio clinico in cartella. Atleta sempre arruolabile.
        </div>
      ) : (
        <ol className="relative space-y-3 p-5">
          {/* linea timeline */}
          <span className="pointer-events-none absolute bottom-6 left-[26px] top-6 w-px bg-border" />
          {records.map((m) => (
            <TimelineItem key={m.id} record={m} missed={missedFor(episodeDays(m), freq.tpw, freq.mpw)} onReferto={() => setReferto(m)} />
          ))}
        </ol>
      )}

      {referto && <RefertoModal record={referto} athlete={athlete} clientName={clientName} onClose={() => setReferto(null)} />}
    </Panel>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight tnum" style={{ color: tone }}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-muted-2">{sub}</div>}
    </div>
  );
}

function TimelineItem({ record: m, missed, onReferto }: { record: MedicalRecord; missed: { trainings: number; matches: number }; onReferto: () => void }) {
  const sev = m.severity ? SEVERITY_META[m.severity] : null;
  const isActive = m.phase !== "conclusa";
  const dotColor = isActive ? (sev?.color ?? "var(--warn)") : "var(--muted-2)";

  return (
    <li className="relative flex gap-3 pl-1">
      {/* nodo */}
      <span className="relative z-[1] mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface" style={{ backgroundColor: `color-mix(in srgb, ${dotColor} 16%, var(--surface))`, color: dotColor }}>
        <Icon name={TYPE_ICON[m.type] ?? "medical"} size={16} />
      </span>

      <div className="lift flex-1 rounded-xl border border-border bg-surface p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold leading-tight">{m.injury}</span>
              {isActive && <span className="dot-live inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">{m.bodyPart} · <span className="capitalize">{m.type}</span>{m.mechanism ? ` · ${m.mechanism}` : ""}</div>
          </div>
          <button onClick={onReferto} className="brand-soft-bg brand-text inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-transform hover:scale-[1.03]">
            <Icon name="clipboard" size={13} /> Referto
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
          <span className="text-muted">{fmt(m.date)}{m.returnedAt ? ` → ${fmt(m.returnedAt)}` : ""}</span>
          {m.daysOut != null && <Pill icon="stopwatch" text={`${m.daysOut} gg stop`} />}
          {(missed.trainings > 0 || missed.matches > 0) && <Pill icon="calendar" text={`~${missed.trainings} all. · ${missed.matches} part. saltati`} />}
          {sev && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ color: sev.color, backgroundColor: `color-mix(in srgb, ${sev.color} 12%, transparent)` }}>{sev.label}</span>}
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-medium capitalize text-muted">{m.phase}</span>
          {m.attachments && m.attachments.length > 0 && <Pill icon="upload" text={`${m.attachments.length} referto PDF`} />}
        </div>

        {isActive && (
          <>
            <PhaseBar phase={m.phase} />
            <div className="mt-2 flex items-start gap-1.5 text-[12px] text-muted"><span className="font-medium text-foreground/70">Trattamento:</span> {m.treatment}</div>
            {m.expectedReturn && <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: dotColor }}><Icon name="calendar" size={12} /> Rientro previsto {fmt(m.expectedReturn)}</div>}
          </>
        )}
      </div>
    </li>
  );
}

function Pill({ icon, text }: { icon: string; text: string }) {
  return <span className="inline-flex items-center gap-1 text-muted"><Icon name={icon} size={12} /> {text}</span>;
}

function PhaseBar({ phase }: { phase: string }) {
  const idx = PHASE_STEPS.indexOf(phase as (typeof PHASE_STEPS)[number]);
  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {PHASE_STEPS.slice(0, 4).map((p, i) => (
          <div key={p} className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full transition-all" style={{ width: i <= idx ? "100%" : "0%", backgroundColor: i <= idx ? "var(--brand-primary)" : "transparent" }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-muted-2">
        <span>Acuta</span><span>Subacuta</span><span>Riatletizz.</span><span>Return to play</span>
      </div>
    </div>
  );
}

// ---- Referto: documento clinico apribile in un clic -------------------------
function RefertoModal({ record: m, athlete, clientName, onClose }: { record: MedicalRecord; athlete: Athlete; clientName: string; onClose: () => void }) {
  const a = athlete;
  const sev = m.severity ? SEVERITY_META[m.severity] : null;
  const age = Math.floor((Date.parse("2026-06-22") - Date.parse(a.birthDate)) / (365.25 * 86400000));
  const pdf = m.attachments?.[0];

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader
        title="Referto medico"
        subtitle={`${clientName} · Area Medica`}
        onClose={onClose}
        accent="var(--brand-primary)"
      />
      <div className="overflow-y-auto">
        {/* Intestazione documento */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-2">
              <Icon name="medical" size={15} className="brand-text" /> Documento clinico riservato
            </div>
            <span className="text-[11px] text-muted-2">Prot. {m.id.slice(-6).toUpperCase()}</span>
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Field label="Paziente" value={`${a.firstName} ${a.lastName}`} />
            <Field label="Nato il / Età" value={`${fmt(a.birthDate)} · ${age} anni`} />
            <Field label="Ruolo / Numero" value={`${a.role} · #${a.shirtNumber}`} />
            <Field label="Medico referente" value={m.doctor ?? "—"} />
          </div>
        </div>

        {/* Diagnosi */}
        <div className="px-6 py-4">
          <SectionTitle>Diagnosi</SectionTitle>
          <div className="mt-2 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{m.injury}</span>
              {sev && <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color: sev.color, backgroundColor: `color-mix(in srgb, ${sev.color} 12%, transparent)` }}>{sev.label}</span>}
            </div>
            <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Field label="Sede anatomica" value={m.bodyPart} />
              <Field label="Tipologia" value={m.type} cap />
              <Field label="Meccanismo lesionale" value={m.mechanism ?? "—"} />
              <Field label="Stato" value={m.phase} cap />
            </div>
          </div>
        </div>

        {/* Decorso */}
        <div className="px-6 pb-4">
          <SectionTitle>Decorso clinico</SectionTitle>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <DateCard label="Insorgenza" value={fmt(m.date)} />
            <DateCard label="Giorni di stop" value={m.daysOut != null ? `${m.daysOut} gg` : "—"} />
            <DateCard label={m.returnedAt ? "Rientro effettivo" : "Rientro previsto"} value={fmt(m.returnedAt ?? m.expectedReturn)} accent />
          </div>
          <div className="mt-3 rounded-xl border border-border bg-background p-4 text-[13px] leading-relaxed">
            <span className="font-semibold">Trattamento e indicazioni: </span>{m.treatment}
          </div>
        </div>

        {/* Allegato PDF (referto reale caricato in Area Medica) */}
        {pdf && (
          <div className="px-6 pb-4">
            <SectionTitle>Referto allegato</SectionTitle>
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <iframe src={pdf.url} title={pdf.name} className="h-[420px] w-full bg-white" />
            </div>
            <a href={pdf.url} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold brand-text hover:underline">
              <Icon name="upload" size={14} /> Apri / scarica {pdf.name}
            </a>
          </div>
        )}

        {/* Firma */}
        <div className="flex items-end justify-between border-t border-border px-6 py-4">
          <div className="text-[11px] text-muted-2">Documento generato dalla piattaforma TESTÀRE · uso clinico interno.</div>
          <div className="text-right">
            <div className="h-8 w-40 border-b border-dashed border-border" />
            <div className="mt-1 text-[12px] font-semibold">{m.doctor ?? "Staff medico"}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, cap }: { label: string; value: string; cap?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
      <div className={`text-[13px] font-medium ${cap ? "capitalize" : ""}`}>{value}</div>
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-2">{children}</div>;
}
function DateCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "brand-border bg-brand-soft" : "border-border bg-background"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${accent ? "brand-text" : ""}`}>{value}</div>
    </div>
  );
}
