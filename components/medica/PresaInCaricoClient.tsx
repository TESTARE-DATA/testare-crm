"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete, InjurySeverity, MedicalClosure, MedicalIntake, MedicalRecord, StaffMember } from "@/lib/types";
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
import { IntakeScheda } from "@/components/medica/IntakeScheda";

type IntakeValues = Omit<MedicalIntake, "id" | "clientId" | "updatedAt">;

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—");
const SEV_COLOR: Record<string, string> = { lieve: "var(--elite)", moderato: "var(--warn)", grave: "var(--bad)" };

export function PresaInCaricoClient({ clientId, seedAthletes, seedMedical, seedIntakes, initialMedical, initialIntakes, initialClosures, staff }: { clientId: string; seedAthletes: Athlete[]; seedMedical: MedicalRecord[]; seedIntakes: MedicalIntake[]; initialMedical?: MedicalRecord[]; initialIntakes?: MedicalIntake[]; initialClosures?: MedicalClosure[]; staff: StaffMember[] }) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: localMedical, add: addMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`, initialMedical);
  const { items: localAthletes, update: updateAthlete } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { setOverride } = useAthleteEdits(clientId);
  const { items: intakes, add: addIntake, update: updateIntake } = useDbCollection<MedicalIntake>(`intake:${clientId}`, initialIntakes);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`, initialClosures);
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

  function save(recordId: string, values: IntakeValues) {
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
        subtitle="Scheda clinica completa · valutazione, prognosi, piano e affidamento"
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
          <p className="max-w-sm text-sm text-muted">Gli invii dalla <Link href={sectionHref(clientId, "rosa")} className="brand-text font-semibold hover:underline">Rosa</Link> arrivano qui. Una volta compilati e affidati a un professionista, passano al <Link href={sectionHref(clientId, "area-medica/diario")} className="brand-text font-semibold hover:underline">Diario riabilitativo</Link>.</p>
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
                  <div className="mt-3 border-t border-border pt-3">
                    <IntakeScheda intake={intake} record={m} />
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

function IntakeModal({ entry, staff, onClose, onSave }: { entry: { record: MedicalRecord; athlete: Athlete; intake?: MedicalIntake }; staff: StaffMember[]; onClose: () => void; onSave: (v: IntakeValues) => void }) {
  const i = entry.intake, r = entry.record;
  const [form, setForm] = useState({
    dataInfortunio: i?.dataInfortunio ?? r.date,
    meccanismo: i?.meccanismo ?? r.mechanism ?? "",
    gravita: (i?.gravita ?? r.severity ?? "") as InjurySeverity | "",
    // La segnalazione dello staff (record.injury) è anamnesi, non diagnosi:
    // il medico la trova già scritta e formula lui la diagnosi.
    anamnesi: i?.anamnesi ?? r.injury,
    esameObiettivo: i?.esameObiettivo ?? "",
    sospettoDiagnostico: i?.sospettoDiagnostico ?? "",
    esamiStrumentali: i?.esamiStrumentali ?? "",
    diagnosi: i?.diagnosi ?? "",
    prognosiGiorni: (i?.prognosiGiorni ?? r.daysOut ?? "") as number | "",
    prognosi: i?.prognosi ?? "",
    prescrizione: i?.prescrizione ?? r.treatment,
    obiettivi: i?.obiettivi ?? "",
    cautele: i?.cautele ?? "",
    assignedTo: i?.assignedTo ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const t = (s: string) => s.trim() || undefined;

  function submit() {
    const member = staff.find((s) => s.name === form.assignedTo);
    onSave({
      dataInfortunio: form.dataInfortunio || undefined,
      meccanismo: t(form.meccanismo),
      gravita: (form.gravita || undefined) as InjurySeverity | undefined,
      anamnesi: t(form.anamnesi),
      esameObiettivo: t(form.esameObiettivo),
      sospettoDiagnostico: t(form.sospettoDiagnostico),
      esamiStrumentali: t(form.esamiStrumentali),
      diagnosi: t(form.diagnosi),
      prognosiGiorni: form.prognosiGiorni === "" ? undefined : Number(form.prognosiGiorni),
      prognosi: t(form.prognosi),
      prescrizione: t(form.prescrizione),
      obiettivi: t(form.obiettivi),
      cautele: t(form.cautele),
      assignedTo: form.assignedTo || undefined,
      assignedRole: member?.role,
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Scheda clinica" subtitle={`${entry.athlete.firstName} ${entry.athlete.lastName} · ${entry.record.injury}`} onClose={onClose} accent="var(--med)" />
      <div className="space-y-5 overflow-y-auto p-6">
        <div className="rounded-xl med-soft-bg p-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold med-accent"><Icon name="users" size={13} /> Affidato a (staff)</span>
            <select className="inp" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
              <option value="">— non assegnato —</option>
              {staff.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.role}</option>)}
            </select>
          </label>
        </div>

        <Section title="Inquadramento">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Data infortunio"><input type="date" className="inp" value={form.dataInfortunio} onChange={(e) => set("dataInfortunio", e.target.value)} /></Field>
            <Field label="Meccanismo"><input className="inp" value={form.meccanismo} onChange={(e) => set("meccanismo", e.target.value)} placeholder="es. sprint, contrasto…" /></Field>
            <Field label="Gravità">
              <select className="inp" value={form.gravita} onChange={(e) => set("gravita", e.target.value as InjurySeverity | "")}>
                <option value="">—</option><option value="lieve">lieve</option><option value="moderato">moderato</option><option value="grave">grave</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Valutazione">
          <div className="grid gap-3 sm:grid-cols-2">
            <Area label="Anamnesi" value={form.anamnesi} onChange={(v) => set("anamnesi", v)} placeholder="Storia clinica, episodi precedenti, sintomi…" />
            <Area label="Esame obiettivo" value={form.esameObiettivo} onChange={(v) => set("esameObiettivo", v)} placeholder="Ispezione, palpazione, ROM, dolore (NRS), test…" />
            <Area label="Sospetto diagnostico" value={form.sospettoDiagnostico} onChange={(v) => set("sospettoDiagnostico", v)} placeholder="Ipotesi iniziale in attesa di conferma strumentale…" />
            <Area label="Esami strumentali" value={form.esamiStrumentali} onChange={(v) => set("esamiStrumentali", v)} placeholder="Eco / RX / RMN ed esito…" />
            <Area label="Diagnosi" value={form.diagnosi} onChange={(v) => set("diagnosi", v)} placeholder="Diagnosi clinica e strumentale…" />
          </div>
        </Section>

        <Section title="Prognosi">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stop stimato (giorni)"><input type="number" min={0} className="inp" value={form.prognosiGiorni} onChange={(e) => set("prognosiGiorni", e.target.value === "" ? "" : Math.max(0, +e.target.value))} /></Field>
            <Area label="Criteri di rientro" value={form.prognosi} onChange={(v) => set("prognosi", v)} placeholder="Criteri funzionali per il rientro…" />
          </div>
        </Section>

        <Section title="Piano riabilitativo">
          <div className="grid gap-3 sm:grid-cols-2">
            <Area label="Piano terapeutico" value={form.prescrizione} onChange={(v) => set("prescrizione", v)} placeholder="Terapie, esercizi, indicazioni e controlli…" />
            <Area label="Obiettivi riabilitativi" value={form.obiettivi} onChange={(v) => set("obiettivi", v)} placeholder="Obiettivi per fase…" />
            <Area label="Indicazioni e cautele" value={form.cautele} onChange={(v) => set("cautele", v)} placeholder="Cosa evitare, segnali d'allarme…" full />
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} className="med-accent-bg inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"><Icon name="clipboard" size={15} /> Salva scheda</button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Area({ label, value, onChange, placeholder, full }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[12px] font-semibold text-muted">{label}</span>
      <textarea className="inp min-h-[80px] resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
