"use client";

import { useState } from "react";
import type { Athlete } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { BodyMap } from "@/components/medica/BodyMap";
import type { MedicalDraft } from "@/components/medica/SendToMedicalModal";

// ============================================================================
// Segnalazione dello staff all'area medica: NON è una diagnosi. Due modalità:
// • Localizzato → sintomo + distretto (sull'omino).
// • Sistemico   → condizione non localizzata (influenza, svenimento, febbre…).
// Il medico farà la diagnosi nella Presa in carico. Restituisce una bozza
// minima (MedicalDraft): l'episodio entra in triage in area medica.
// ============================================================================

const SINTOMI = ["Dolore", "Indolenzimento", "Gonfiore", "Contrattura", "Trauma / colpo", "Affaticamento", "Movimento limitato", "Altro"];
const SISTEMICI = ["Influenza", "Febbre", "Svenimento", "Vertigini", "Mal di testa", "Disturbo gastrointestinale", "Malessere generale", "Altro"];

const todayISO = () => new Date().toISOString().slice(0, 10);

export function SegnalazioneModal({
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
  const [mode, setMode] = useState<"locale" | "sistemico">("locale");
  const [sintomo, setSintomo] = useState<string | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [condizione, setCondizione] = useState<string | null>(null);
  const [dettaglio, setDettaglio] = useState("");

  const canSubmit = mode === "locale" ? !!sintomo && !!zona : !!condizione;

  function submit() {
    if (!canSubmit) return;
    const isLocale = mode === "locale";
    const motivo = [isLocale ? sintomo : condizione, dettaglio.trim()].filter(Boolean).join(" · ");
    onSubmit({
      status: "in valutazione", // provvisorio finché il medico non decide
      record: {
        athleteId: athlete.id,
        type: isLocale ? "infortunio" : "malattia",
        injury: motivo,
        bodyPart: isLocale ? zona! : "Sistemico",
        date: todayISO(),
        phase: "acuta",
        treatment: "Da valutare",
      },
    });
    onClose();
  }

  const StepNum = ({ n }: { n: number }) => (
    <span className="flex h-5 w-5 items-center justify-center rounded-md brand-soft-bg brand-text text-[11px] font-extrabold">{n}</span>
  );

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Segnala all'area medica" subtitle="Il medico valuterà — non è una diagnosi" onClose={onClose} accent="var(--brand-primary)" />
      <div className="overflow-y-auto">
        {/* Atleta */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-6 py-3">
          <Avatar firstName={athlete.firstName} lastName={athlete.lastName} photoUrl={photoUrl ?? athlete.photoUrl} shirtNumber={athlete.shirtNumber} size={44} />
          <div>
            <div className="text-base font-bold leading-tight">{athlete.firstName} {athlete.lastName}</div>
            <div className="text-[12px] text-muted">{athlete.role} · #{athlete.shirtNumber}</div>
          </div>
        </div>

        {/* Modalità */}
        <div className="flex gap-2 px-6 pt-5">
          <ModeBtn active={mode === "locale"} icon="medical" label="Problema localizzato" onClick={() => setMode("locale")} />
          <ModeBtn active={mode === "sistemico"} icon="pulse" label="Problema sistemico" onClick={() => setMode("sistemico")} />
        </div>

        {mode === "locale" ? (
          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2"><StepNum n={1} /> Sintomo riferito</div>
              <div className="flex flex-wrap gap-2">
                {SINTOMI.map((s) => (
                  <Chip key={s} active={sintomo === s} onClick={() => setSintomo(s)}>{s}</Chip>
                ))}
              </div>
              <Detail value={dettaglio} onChange={setDettaglio} placeholder="es. comparso dopo lo sprint, peggiora in appoggio…" />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2"><StepNum n={2} /> Distretto interessato</div>
              <BodyMap value={zona} onSelect={setZona} />
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-2"><StepNum n={1} /> Condizione (non localizzata)</div>
            <div className="flex flex-wrap gap-2">
              {SISTEMICI.map((s) => (
                <Chip key={s} active={condizione === s} onClick={() => setCondizione(s)}>{s}</Chip>
              ))}
            </div>
            <div className="max-w-xl"><Detail value={dettaglio} onChange={setDettaglio} placeholder="es. comparso stamattina, parametri da controllare…" /></div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <div className="text-[12px] text-muted">
            {canSubmit ? (
              <span><span className="font-semibold text-foreground">{mode === "locale" ? sintomo : condizione}</span> · {mode === "locale" ? zona : "sistemico"}</span>
            ) : (
              <span className="text-muted-2">{mode === "locale" ? "Scegli sintomo e zona per inviare" : "Scegli una condizione per inviare"}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
            <button onClick={submit} disabled={!canSubmit} className="brand-bg brand-on inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
              <Icon name="medical" size={15} /> Invia segnalazione
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ModeBtn({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? "brand-border brand-text bg-brand-soft" : "border-border text-muted hover:bg-background hover:text-foreground"}`}>
      <Icon name={icon} size={15} /> {label}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${active ? "brand-border brand-text bg-brand-soft" : "border-border text-muted hover:bg-background hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function Detail({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1 block text-[12px] font-medium text-muted">Dettaglio (facoltativo)</span>
      <textarea className="inp min-h-[90px] resize-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
