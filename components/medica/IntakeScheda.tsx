import type { MedicalIntake, MedicalRecord } from "@/lib/types";
import { Icon } from "@/components/Icon";

// ============================================================================
// Scheda clinica (sola lettura) della presa in carico del medico. Identica in
// Presa in carico e nel Diario riabilitativo: il fisioterapista vede esattamente
// cosa ha valutato il medico.
// ============================================================================

const SEV_COLOR: Record<string, string> = { lieve: "var(--elite)", moderato: "var(--warn)", grave: "var(--bad)" };
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : undefined);

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-background p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="mt-0.5 whitespace-pre-line text-[13px] leading-snug">{value}</div>
    </div>
  );
}

export function IntakeScheda({ intake, record, compact }: { intake?: MedicalIntake; record?: MedicalRecord; compact?: boolean }) {
  if (!intake) return null;
  const i = intake;
  const dataInf = i.dataInfortunio ?? record?.date;
  const mecc = i.meccanismo ?? record?.mechanism;
  const grav = i.gravita ?? record?.severity;
  const diag = i.diagnosi ?? record?.injury;
  const prognosi = [i.prognosiGiorni ? `Stop stimato ${i.prognosiGiorni} gg` : null, i.prognosi].filter(Boolean).join(" · ");

  return (
    <div className="space-y-3">
      {/* Inquadramento */}
      {(dataInf || mecc || grav) && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {dataInf && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted"><Icon name="calendar" size={11} /> {fmt(dataInf)}</span>}
          {mecc && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted">{mecc}</span>}
          {grav && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" style={{ color: SEV_COLOR[grav], backgroundColor: `color-mix(in srgb, ${SEV_COLOR[grav]} 12%, transparent)` }}>{grav}</span>}
        </div>
      )}

      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Field label="Anamnesi" value={i.anamnesi} />
        <Field label="Esame obiettivo" value={i.esameObiettivo} />
        <Field label="Esami strumentali" value={i.esamiStrumentali} />
        <Field label="Diagnosi" value={diag} />
        <Field label="Prognosi" value={prognosi || undefined} />
        <Field label="Piano terapeutico" value={i.prescrizione} />
        <Field label="Obiettivi riabilitativi" value={i.obiettivi} />
        <Field label="Indicazioni e cautele" value={i.cautele} />
      </div>

      {i.assignedTo && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted">
          <Icon name="users" size={13} className="med-accent" /> Affidato a <span className="font-semibold text-foreground">{i.assignedTo}</span>{i.assignedRole ? ` · ${i.assignedRole}` : ""}
        </div>
      )}
    </div>
  );
}
