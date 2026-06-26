"use client";

import { useState } from "react";
import type { Athlete, AthleteStatus, InjuryPhase, InjurySeverity, MedicalRecord, MedicalType } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";

const TYPES: MedicalType[] = ["infortunio", "sovraccarico", "malattia", "controllo"];
const PHASES: InjuryPhase[] = ["acuta", "subacuta", "riatletizzazione", "return to play"];
const SEVERITIES: InjurySeverity[] = ["lieve", "moderato", "grave"];
const DOCTORS = ["Dott. M. Ferri", "Dott.ssa L. Conti", "Dott. A. Greco"];

interface Template {
  label: string;
  icon: string;
  type: MedicalType;
  injury: string;
  bodyPart: string;
  severity: InjurySeverity;
  phase: InjuryPhase;
  mechanism: string;
  days: number;
  treatment: string;
  status: AthleteStatus;
}

/** Template clinici pronti: un clic precompila il modulo. */
const TEMPLATES: Template[] = [
  { label: "Lesione muscolare", icon: "pulse", type: "infortunio", injury: "Lesione muscolare dei flessori", bodyPart: "Coscia post.", severity: "moderato", phase: "acuta", mechanism: "Sprint ad alta velocità", days: 21, treatment: "Scarico, terapia fisica, lavoro eccentrico progressivo.", status: "infortunato" },
  { label: "Distorsione caviglia", icon: "medical", type: "infortunio", injury: "Distorsione della caviglia", bodyPart: "Caviglia", severity: "moderato", phase: "acuta", mechanism: "Appoggio scomposto / contrasto", days: 24, treatment: "PRICE, propriocezione, carico progressivo.", status: "infortunato" },
  { label: "Sovraccarico tendineo", icon: "load", type: "sovraccarico", injury: "Tendinopatia", bodyPart: "Ginocchio", severity: "lieve", phase: "riatletizzazione", mechanism: "Carico ripetuto", days: 14, treatment: "Gestione del carico, isometria, monitoraggio.", status: "in recupero" },
  { label: "Affaticamento", icon: "battery", type: "sovraccarico", injury: "Affaticamento muscolare", bodyPart: "Polpaccio", severity: "lieve", phase: "riatletizzazione", mechanism: "Accumulo di carico", days: 6, treatment: "Scarico attivo, defaticante, rivalutazione.", status: "in recupero" },
  { label: "Sindrome influenzale", icon: "moon", type: "malattia", injury: "Sindrome influenzale", bodyPart: "—", severity: "lieve", phase: "acuta", mechanism: "Virale stagionale", days: 5, treatment: "Riposo, idratazione, monitoraggio parametri.", status: "infortunato" },
  { label: "Controllo / accertamenti", icon: "clipboard", type: "controllo", injury: "Controllo programmato", bodyPart: "—", severity: "lieve", phase: "return to play", mechanism: "—", days: 2, treatment: "Accertamenti diagnostici e valutazione.", status: "in recupero" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, d: number) => { const dt = new Date(iso + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + d); return dt.toISOString().slice(0, 10); };

export interface MedicalDraft { record: Omit<MedicalRecord, "id" | "clientId">; status: AthleteStatus }

/**
 * Modulo "Invia in area medica": apre una cartella dedicata da compilare con i
 * motivi clinici. I template velocizzano la compilazione. Restituisce la bozza
 * di cartella + il nuovo stato dell'atleta (per i bordi colorati in Area Medica).
 */
export function SendToMedicalModal({
  athlete,
  photoUrl,
  onClose,
  onSubmit,
}: {
  athlete: Athlete;
  photoUrl?: string;
  onClose: () => void;
  onSubmit: (draft: MedicalDraft) => void;
}) {
  const [tpl, setTpl] = useState<string | null>(null);
  const [form, setForm] = useState({
    status: "infortunato" as AthleteStatus,
    type: "infortunio" as MedicalType,
    injury: "",
    bodyPart: "",
    severity: "moderato" as InjurySeverity,
    phase: "acuta" as InjuryPhase,
    mechanism: "",
    days: 14,
    treatment: "",
    notes: "",
    doctor: DOCTORS[0],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function applyTemplate(t: Template) {
    setTpl(t.label);
    setForm((f) => ({ ...f, status: t.status, type: t.type, injury: t.injury, bodyPart: t.bodyPart, severity: t.severity, phase: t.phase, mechanism: t.mechanism, days: t.days, treatment: t.treatment }));
  }

  function submit() {
    if (!form.injury.trim()) return;
    const date = todayISO();
    onSubmit({
      status: form.status,
      record: {
        athleteId: athlete.id,
        type: form.type,
        injury: form.injury.trim(),
        bodyPart: form.bodyPart.trim() || "—",
        date,
        phase: form.phase,
        treatment: form.treatment.trim() || "Da definire",
        expectedReturn: plusDays(date, form.days),
        severity: form.severity,
        mechanism: form.mechanism.trim() || undefined,
        daysOut: form.days,
        doctor: form.doctor,
      },
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Invia in area medica" subtitle="Apri una cartella clinica per l'atleta" onClose={onClose} accent="var(--brand-primary)" />
      <div className="overflow-y-auto">
        {/* Atleta */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-6 py-3">
          <Avatar firstName={athlete.firstName} lastName={athlete.lastName} photoUrl={photoUrl ?? athlete.photoUrl} shirtNumber={athlete.shirtNumber} size={44} />
          <div>
            <div className="text-base font-bold leading-tight">{athlete.firstName} {athlete.lastName}</div>
            <div className="text-[12px] text-muted">{athlete.role} · #{athlete.shirtNumber}</div>
          </div>
        </div>

        <div className="p-6">
          {/* Template rapidi */}
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2">Template rapidi</div>
          <div className="mb-5 flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => applyTemplate(t)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ${tpl === t.label ? "brand-border brand-text bg-brand-soft" : "border-border text-muted hover:bg-background hover:text-foreground"}`}>
                <Icon name={t.icon} size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* Stato risultante (guida i bordi colorati) */}
          <div className="mb-4">
            <Label>Stato dell&apos;atleta</Label>
            <div className="grid grid-cols-2 gap-2">
              <StatusOption active={form.status === "infortunato"} color="var(--bad)" label="Fermo · infortunato" onClick={() => set("status", "infortunato")} />
              <StatusOption active={form.status === "in recupero"} color="var(--warn)" label="In recupero" onClick={() => set("status", "in recupero")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Motivo / diagnosi" full><input className="inp" value={form.injury} onChange={(e) => set("injury", e.target.value)} placeholder="es. Lesione I grado bicipite femorale" autoFocus /></Field>
            <Field label="Tipo">
              <select className="inp" value={form.type} onChange={(e) => set("type", e.target.value as MedicalType)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Zona corporea"><input className="inp" value={form.bodyPart} onChange={(e) => set("bodyPart", e.target.value)} placeholder="es. Coscia post. dx" /></Field>
            <Field label="Gravità">
              <select className="inp" value={form.severity} onChange={(e) => set("severity", e.target.value as InjurySeverity)}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Fase">
              <select className="inp" value={form.phase} onChange={(e) => set("phase", e.target.value as InjuryPhase)}>{PHASES.map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
            <Field label="Meccanismo lesionale"><input className="inp" value={form.mechanism} onChange={(e) => set("mechanism", e.target.value)} placeholder="es. sprint ad alta velocità" /></Field>
            <Field label="Stop stimato (giorni)"><input type="number" min={0} className="inp" value={form.days} onChange={(e) => set("days", Math.max(0, +e.target.value))} /></Field>
            <Field label="Trattamento" full><textarea className="inp min-h-[64px] resize-none" value={form.treatment} onChange={(e) => set("treatment", e.target.value)} placeholder="Indicazioni terapeutiche e percorso." /></Field>
            <Field label="Medico referente">
              <select className="inp" value={form.doctor} onChange={(e) => set("doctor", e.target.value)}>{DOCTORS.map((d) => <option key={d}>{d}</option>)}</select>
            </Field>
            <Field label="Rientro stimato"><input className="inp bg-background" value={plusDays(todayISO(), form.days)} readOnly /></Field>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
            <button onClick={submit} disabled={!form.injury.trim()} className="brand-bg brand-on inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
              <Icon name="medical" size={15} /> Invia in area medica
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-[12px] font-medium text-muted">{children}</span>;
}
function StatusOption({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors" style={active ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color } : { borderColor: "var(--border)", color: "var(--muted)" }}>
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} /> {label}
    </button>
  );
}
