"use client";

import { useRef, useState } from "react";
import type { Athlete, Foot, PlayerRole } from "@/lib/types";
import { fileToDataUrl } from "@/lib/usePhotos";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

export interface AthleteFormValues {
  firstName: string;
  lastName: string;
  role: PlayerRole;
  shirtNumber: number;
  birthDate: string;
  nationality: string;
  foot: Foot;
  heightCm: number;
  weightKg: number;
  status: Athlete["status"];
  /** Data di arrivo in squadra (ISO) — determina il "primo anno". */
  joinedAt: string;
  /** Cresciuto nel settore giovanile/vivaio. */
  fromYouth: boolean;
  photoUrl?: string;
}

/** Form atleta riutilizzabile: creazione (initial assente) o modifica. */
export function AthleteFormModal({
  initial,
  defaultNumber,
  onClose,
  onSave,
}: {
  initial?: Partial<AthleteFormValues>;
  defaultNumber?: number;
  onClose: () => void;
  onSave: (values: AthleteFormValues) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<AthleteFormValues>({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    role: initial?.role ?? "Centrocampista",
    shirtNumber: initial?.shirtNumber ?? defaultNumber ?? 0,
    birthDate: initial?.birthDate ?? "2002-01-01",
    nationality: initial?.nationality ?? "🇮🇹 Italia",
    foot: initial?.foot ?? "Destro",
    heightCm: initial?.heightCm ?? 180,
    weightKg: initial?.weightKg ?? 75,
    status: initial?.status ?? "disponibile",
    joinedAt: initial?.joinedAt ?? new Date().toISOString().slice(0, 10),
    fromYouth: initial?.fromYouth ?? false,
  });
  const [photo, setPhoto] = useState<string | undefined>(initial?.photoUrl);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof AthleteFormValues>(k: K, v: AthleteFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto(await fileToDataUrl(file));
  }

  function submit() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    onSave({ ...form, photoUrl: photo });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={isEdit ? "Modifica atleta" : "Nuovo atleta"} onClose={onClose} />
      <div className="overflow-y-auto p-6">
        {/* Foto (solo in creazione: in modifica si gestisce dall'avatar) */}
        {!isEdit && (
          <div className="mb-4 flex items-center gap-4">
            <Avatar firstName={form.firstName || "?"} lastName={form.lastName || "?"} photoUrl={photo} shirtNumber={form.shirtNumber} size={64} />
            <div>
              <button onClick={() => photoInput.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-background">
                <Icon name="upload" size={14} /> {photo ? "Cambia foto" : "Carica foto"}
              </button>
              <p className="mt-1 text-[11px] text-muted-2">JPG/PNG · ritagliata a 512px</p>
              <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhoto} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome"><input className="inp" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus={!isEdit} /></Field>
          <Field label="Cognome"><input className="inp" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Ruolo">
            <select className="inp" value={form.role} onChange={(e) => set("role", e.target.value as PlayerRole)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Numero"><input type="number" className="inp" value={form.shirtNumber} onChange={(e) => set("shirtNumber", +e.target.value)} /></Field>
          <Field label="Data di nascita"><input type="date" className="inp" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></Field>
          <Field label="Nazionalità"><input className="inp" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="🇮🇹 Italia" /></Field>
          <Field label="Piede">
            <select className="inp" value={form.foot} onChange={(e) => set("foot", e.target.value as Foot)}>
              <option>Destro</option><option>Sinistro</option><option>Ambidestro</option>
            </select>
          </Field>
          <Field label="Stato">
            <select className="inp" value={form.status} onChange={(e) => set("status", e.target.value as Athlete["status"])}>
              <option>disponibile</option><option>infortunato</option><option>in recupero</option><option>a riposo</option>
            </select>
          </Field>
          <Field label="Altezza (cm)"><input type="number" className="inp" value={form.heightCm} onChange={(e) => set("heightCm", +e.target.value)} /></Field>
          <Field label="Peso (kg)"><input type="number" className="inp" value={form.weightKg} onChange={(e) => set("weightKg", +e.target.value)} /></Field>
          <Field label="In squadra dal"><input type="date" className="inp" value={form.joinedAt} onChange={(e) => set("joinedAt", e.target.value)} /></Field>
          <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-lg border border-border px-3 py-2.5">
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand-primary)]" checked={form.fromYouth} onChange={(e) => set("fromYouth", e.target.checked)} />
            <span className="text-[13px] font-medium">Cresciuto nel settore giovanile</span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">{isEdit ? "Salva modifiche" : "Salva atleta"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
