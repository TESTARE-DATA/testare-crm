"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, MedicalClosure, MedicalIntake, MedicalRecord, StaffMember } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { useRoster } from "@/lib/useRoster";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { usePhotos } from "@/lib/usePhotos";
import { caseStage } from "@/lib/medical-flow";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";
import { SendToMedicalModal, type MedicalDraft } from "@/components/medica/SendToMedicalModal";
import { AthletePicker } from "@/components/medica/AthletePicker";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—");
const SEV_COLOR: Record<string, string> = { lieve: "var(--elite)", moderato: "var(--warn)", grave: "var(--bad)" };

export function PresaInCaricoClient({ clientId, seedAthletes, seedMedical, seedIntakes, staff }: { clientId: string; seedAthletes: Athlete[]; seedMedical: MedicalRecord[]; seedIntakes: MedicalIntake[]; staff: StaffMember[] }) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: localMedical, add: addMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`);
  const { items: localAthletes, update: updateAthlete } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { setOverride } = useAthleteEdits(clientId);
  const { items: intakes, add: addIntake, update: updateIntake } = useDbCollection<MedicalIntake>(`intake:${clientId}`);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`);
  const [editing, setEditing] = useState<{ record: MedicalRecord; athlete: Athlete; intake?: MedicalIntake } | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Athlete | null>(null);

  const intakeMap = useMemo(() => new Map([...seedIntakes, ...intakes].map((i) => [i.id, i])), [seedIntakes, intakes]);
  const closedIds = useMemo(() => new Set(closures.map((c) => c.id)), [closures]);
  const localAthIds = useMemo(() => new Set(localAthletes.map((a) => a.id)), [localAthletes]);
  const ath = (id: string) => athletes.find((a) => a.id === id);

  // Coda = casi in TRIAGE (attivi, non ancora affidati a un professionista).
  const queue = useMemo(() => {
    return [...seedMedical, ...localMedical]
      .filter((m) => caseStage(m, intakeMap.get(m.id), closedIds.has(m.id)) === "triage")
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [seedMedical, localMedical, intakeMap, closedIds]);

  const pending = queue.length;

  // Atleti selezionabili: chi NON ha già una cartella attiva (in qualsiasi stadio).
  const activeAthleteIds = useMemo(() => new Set([...seedMedical, ...localMedical].filter((m) => m.phase !== "conclusa" && !closedIds.has(m.id)).map((m) => m.athleteId)), [seedMedical, localMedical, closedIds]);
  const selectable = athletes.filter((a) => !activeAthleteIds.has(a.id));

  function save(recordId: string, values: Pick<MedicalIntake, "anamnesi" | "diagnosi" | "prognosi" | "prescrizione" | "assignedTo" | "assignedRole">) {
    const now = new Date().toISOString();
    if (intakeMap.has(recordId)) updateIntake(recordId, { ...values, updatedAt: now });
    else addIntake({ id: recordId, clientId, ...values, updatedAt: now });
  }

  /** Prende in carico un atleta della rosa: crea la cartella e ne aggiorna lo stato. */
  function takeInCharge(a: Athlete, draft: MedicalDraft) {
    addMedical({ ...draft.record, id: newId(`${clientId}-med`), clientId });
    if (localAthIds.has(a.id)) updateAthlete(a.id, { status: draft.status });
    else setOverride(a.id, { status: draft.status });
    setPicked(null);
  }

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <MedHeader
        section="Triage clinico"
        title="Presa in carico"
        subtitle="Anamnesi · diagnosi · prognosi · prescrizione · affidamento"
        icon="clipboard"
        actions={<button onClick={() => setPicking(true)} className="med-accent-bg flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"><Icon name="users" size={16} /> Prendi in carico</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard label="In triage" value={queue.length} tone="warn" icon="medical" />
        <StatCard label="Affidati al fisio" value={activeAthleteIds.size - pending} tone="good" icon="clipboard" />
      </div>

      {queue.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="sparkle" size={24} /></span>
          <div className="text-base font-semibold">Nessun caso da valutare</div>
          <p className="max-w-sm text-sm text-muted">Gli invii dalla <Link href={sectionHref(clientId, "rosa")} className="brand-text font-semibold hover:underline">Rosa</Link> arrivano qui. Una volta compilati e affidati a un professionista, passano al <Link href={sectionHref(clientId, "area-medica/diario")} className="brand-text font-semibold hover:underline">Diario fisioterapico</Link>.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((m) => {
            const a = ath(m.athleteId);
            if (!a) return null;
            const intake = intakeMap.get(m.id);
            const done = !!intake;
            return (
              <div key={m.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="truncate font-bold hover:underline">{a.firstName} {a.lastName}</Link>
                      <span className="text-[12px] text-muted">{a.role} · #{a.shirtNumber}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
                      <span className="font-semibold">{m.injury}</span>
                      <span className="text-muted">{m.bodyPart}</span>
                      {m.severity && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: SEV_COLOR[m.severity], backgroundColor: `color-mix(in srgb, ${SEV_COLOR[m.severity]} 12%, transparent)` }}>{m.severity}</span>}
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 capitalize text-muted">{m.phase}</span>
                      <span className="font-mono text-muted-2">#{m.id.slice(-6).toUpperCase()} · arrivo {fmt(m.date)}</span>
                      {intake?.assignedTo && (
                        <span className="inline-flex items-center gap-1 rounded-full med-soft-bg med-accent px-2 py-0.5 font-semibold"><Icon name="users" size={11} /> {intake.assignedTo}</span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={done ? { color: "var(--good)", backgroundColor: "color-mix(in srgb, var(--good) 12%, transparent)" } : { color: "var(--warn)", backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)" }}>
                    {done ? "Presa in carico" : "Da valutare"}
                  </span>
                  <button onClick={() => setEditing({ record: m, athlete: a, intake })} className="brand-bg brand-on inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold">
                    <Icon name="clipboard" size={14} /> {done ? "Modifica" : "Compila"}
                  </button>
                </div>

                {done && (
                  <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <Readout label="Anamnesi" value={intake.anamnesi} />
                    <Readout label="Diagnosi" value={intake.diagnosi} />
                    <Readout label="Prognosi" value={intake.prognosi} />
                    <Readout label="Prescrizione" value={intake.prescrizione} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && <IntakeModal entry={editing} staff={staff} onClose={() => setEditing(null)} onSave={(v) => save(editing.record.id, v)} />}
      {picking && <AthletePicker athletes={selectable} photos={photos} title="Prendi in carico" subtitle="Seleziona un atleta dalla rosa" onPick={(a) => { setPicked(a); setPicking(false); }} onClose={() => setPicking(false)} />}
      {picked && <SendToMedicalModal athlete={picked} photoUrl={photos[picked.id]} onClose={() => setPicked(null)} onSubmit={(draft) => takeInCharge(picked, draft)} />}
    </div>
  );
}

function Readout({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-background p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-2">{label}</div>
      <div className="mt-0.5 text-[13px] leading-snug">{value}</div>
    </div>
  );
}

function IntakeModal({ entry, staff, onClose, onSave }: { entry: { record: MedicalRecord; athlete: Athlete; intake?: MedicalIntake }; staff: StaffMember[]; onClose: () => void; onSave: (v: Pick<MedicalIntake, "anamnesi" | "diagnosi" | "prognosi" | "prescrizione" | "assignedTo" | "assignedRole">) => void }) {
  const i = entry.intake;
  const [form, setForm] = useState({ anamnesi: i?.anamnesi ?? "", diagnosi: i?.diagnosi ?? entry.record.injury, prognosi: i?.prognosi ?? (entry.record.daysOut ? `Stop stimato ${entry.record.daysOut} giorni.` : ""), prescrizione: i?.prescrizione ?? entry.record.treatment, assignedTo: i?.assignedTo ?? "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    const member = staff.find((s) => s.name === form.assignedTo);
    onSave({ anamnesi: form.anamnesi, diagnosi: form.diagnosi, prognosi: form.prognosi, prescrizione: form.prescrizione, assignedTo: form.assignedTo || undefined, assignedRole: member?.role });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Scheda clinica" subtitle={`${entry.athlete.firstName} ${entry.athlete.lastName} · ${entry.record.injury}`} onClose={onClose} accent="var(--med)" />
      <div className="overflow-y-auto p-6">
        {/* Affidamento staff */}
        <div className="mb-4 rounded-xl med-soft-bg p-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold med-accent"><Icon name="users" size={13} /> Affidato a (staff)</span>
            <select className="inp" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
              <option value="">— non assegnato —</option>
              {staff.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.role}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Area label="Anamnesi" value={form.anamnesi} onChange={(v) => set("anamnesi", v)} placeholder="Storia clinica, episodi precedenti, sintomi riferiti…" />
          <Area label="Diagnosi" value={form.diagnosi} onChange={(v) => set("diagnosi", v)} placeholder="Diagnosi clinica e strumentale…" />
          <Area label="Prognosi" value={form.prognosi} onChange={(v) => set("prognosi", v)} placeholder="Tempi di recupero stimati e criteri di rientro…" />
          <Area label="Prescrizione" value={form.prescrizione} onChange={(v) => set("prescrizione", v)} placeholder="Terapie, esercizi, indicazioni e controlli…" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} className="med-accent-bg inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"><Icon name="clipboard" size={15} /> Salva scheda</button>
        </div>
      </div>
    </Modal>
  );
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-muted">{label}</span>
      <textarea className="inp min-h-[96px] resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
