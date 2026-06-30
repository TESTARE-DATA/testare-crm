"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Athlete, MedicalRecord, PlayerRole } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { usePhotos, fileToDataUrl } from "@/lib/usePhotos";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { readinessTier } from "@/lib/readiness";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { AthleteFormModal, type AthleteFormValues } from "@/components/rosa/AthleteFormModal";
import { type MedicalDraft } from "@/components/medica/SendToMedicalModal";
import { SegnalazioneModal } from "@/components/medica/SegnalazioneModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];
const STATUS_TONE: Record<string, "green" | "red" | "amber" | "blue" | "default"> = {
  disponibile: "green",
  infortunato: "red",
  "in valutazione": "blue",
  "in recupero": "amber",
  "a riposo": "default",
};

export function RosaClient({ clientId, seed, readiness }: { clientId: string; seed: Athlete[]; readiness: Record<string, number> }) {
  const { items: local, add, remove: removeLocal, update: updateLocal } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { add: addMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`);
  const { photos, setPhoto } = usePhotos(clientId);
  const { hidden, setOverride, hide, apply } = useAthleteEdits(clientId);
  const [open, setOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [confirmDel, setConfirmDel] = useState<Athlete | null>(null);
  const [medicalFor, setMedicalFor] = useState<Athlete | null>(null);

  const localIds = new Set(local.map((a) => a.id));
  const all = [...seed.filter((a) => !hidden.includes(a.id)).map(apply), ...local].sort((a, b) => a.shirtNumber - b.shirtNumber);

  function addAthlete(v: AthleteFormValues) {
    add({
      id: newId(`${clientId}-ath`),
      clientId,
      firstName: v.firstName, lastName: v.lastName, role: v.role, shirtNumber: v.shirtNumber,
      birthDate: v.birthDate, nationality: v.nationality, foot: v.foot, status: v.status,
      heightCm: v.heightCm, weightKg: v.weightKg, photoUrl: v.photoUrl,
      bodyFatPct: 10, wingspanCm: v.heightCm,
      profile: { forza: 50, potenza: 50, reattivita: 50, simmetria: 85, pIndex: 55, prev: { forza: 50, potenza: 50, reattivita: 50, simmetria: 85, pIndex: 55 } },
      joinedAt: v.joinedAt, fromYouth: v.fromYouth,
    });
  }

  function saveEdit(a: Athlete, v: AthleteFormValues) {
    const patch = {
      firstName: v.firstName, lastName: v.lastName, role: v.role, shirtNumber: v.shirtNumber,
      birthDate: v.birthDate, nationality: v.nationality, foot: v.foot, status: v.status,
      heightCm: v.heightCm, weightKg: v.weightKg, joinedAt: v.joinedAt, fromYouth: v.fromYouth,
    };
    if (localIds.has(a.id)) updateLocal(a.id, patch);
    else setOverride(a.id, patch);
  }

  function doDelete(a: Athlete) {
    if (localIds.has(a.id)) removeLocal(a.id);
    else hide(a.id);
  }

  function sendToMedical(a: Athlete, draft: MedicalDraft) {
    addMedical({ ...draft.record, id: newId(`${clientId}-med`), clientId });
    if (localIds.has(a.id)) updateLocal(a.id, { status: draft.status });
    else setOverride(a.id, { status: draft.status });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl">
            <Icon name="users" size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rosa</h1>
            <p className="mt-0.5 text-sm text-muted">{all.length} atleti</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulk(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-background">
            <Icon name="upload" size={16} /> Carica foto squadra
          </button>
          <button onClick={() => setOpen(true)} className="brand-bg brand-on flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold">
            <Icon name="users" size={16} /> Aggiungi atleta
          </button>
        </div>
      </div>

      {ROLES.map((role) => {
        const group = all.filter((a) => a.role === role);
        if (group.length === 0) return null;
        return (
          <section key={role} className="mb-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {role} <span className="rounded-full bg-background px-2 py-0.5 text-[12px]">{group.length}</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((a) => {
                const isLocal = localIds.has(a.id);
                const photo = photos[a.id] ?? a.photoUrl;
                const rd = readiness[a.id];
                const tier = rd != null ? readinessTier(rd) : null;
                const card = (
                  <div className="card card-hover flex items-center gap-3.5 p-3.5">
                    <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photo} shirtNumber={a.shirtNumber} size={72} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{a.firstName} {a.lastName}</span>
                        {isLocal && <Badge tone="brand">nuovo</Badge>}
                      </div>
                      <div className="truncate text-[12px] text-muted">{a.nationality} · {age(a.birthDate)} anni</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                      </div>
                    </div>
                    {tier ? (
                      <div className="text-right">
                        <div className="text-2xl font-extrabold leading-none" style={{ color: tier.color }}>{rd}<span className="text-sm">%</span></div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-2">Readiness</div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-xl font-bold leading-none text-muted-2">—</div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-2">Readiness</div>
                      </div>
                    )}
                  </div>
                );
                return (
                  <div key={a.id} className="group relative">
                    {/* Sia gli atleti seed sia quelli aggiunti dall'utente aprono la
                        scheda completa: la pagina di dettaglio risolve dal DB. */}
                    <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`}>{card}</Link>
                    {/* Azioni: invia in area medica / modifica / rimuovi */}
                    <div className="absolute right-2.5 top-2.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => setMedicalFor(a)} title="Invia in area medica" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition-colors hover:border-red-300 hover:text-bad">
                        <Icon name="medical" size={14} />
                      </button>
                      <button onClick={() => setEditing(a)} title="Modifica" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition-colors hover:text-foreground">
                        <Icon name="clipboard" size={14} />
                      </button>
                      <button onClick={() => setConfirmDel(a)} title="Rimuovi" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition-colors hover:border-red-300 hover:text-bad">
                        <span className="text-[13px] leading-none">✕</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {open && <AthleteFormModal defaultNumber={all.length + 1} onClose={() => setOpen(false)} onSave={addAthlete} />}
      {editing && <AthleteFormModal initial={editing} onClose={() => setEditing(null)} onSave={(v) => saveEdit(editing, v)} />}
      {medicalFor && <SegnalazioneModal athlete={medicalFor} photoUrl={photos[medicalFor.id]} onClose={() => setMedicalFor(null)} onSubmit={(draft) => sendToMedical(medicalFor, draft)} />}
      {bulk && <BulkPhotoModal athletes={all} onClose={() => setBulk(false)} onApply={(map) => Object.entries(map).forEach(([id, url]) => setPhoto(id, url))} />}
      {confirmDel && (
        <ConfirmDialog
          title="Rimuovere atleta"
          danger
          confirmLabel="Rimuovi"
          message={<>Vuoi rimuovere <b>{confirmDel.firstName} {confirmDel.lastName}</b> dalla rosa? L&apos;atleta sparirà dalle statistiche di squadra.</>}
          onConfirm={() => doDelete(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ---- Caricamento foto multiplo (auto-abbinamento per nome file) -------------
function normalizeName(s: string) {
  // NFD scompone gli accenti, poi [^a-z0-9] rimuove segni combinanti e simboli.
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

function BulkPhotoModal({
  athletes,
  onClose,
  onApply,
}: {
  athletes: Athlete[];
  onClose: () => void;
  onApply: (map: Record<string, string>) => void;
}) {
  const [files, setFiles] = useState<{ name: string; url: string; athleteId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function matchAthlete(filename: string): string {
    const base = normalizeName(filename.replace(/\.[^.]+$/, ""));
    if (base.length < 3) return "";
    let best = "";
    let bestLen = 0;
    for (const a of athletes) {
      for (const c of [normalizeName(a.firstName + a.lastName), normalizeName(a.lastName + a.firstName), normalizeName(a.lastName)]) {
        if (c.length >= 3 && (base.includes(c) || c.includes(base)) && c.length > bestLen) {
          best = a.id;
          bestLen = c.length;
        }
      }
    }
    return best;
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setLoading(true);
    const taken = new Set(files.filter((f) => f.athleteId).map((f) => f.athleteId));
    const out = [...files];
    for (const f of list) {
      const url = await fileToDataUrl(f);
      let id = matchAthlete(f.name);
      if (id && taken.has(id)) id = "";
      if (id) taken.add(id);
      out.push({ name: f.name, url, athleteId: id });
    }
    setFiles(out);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const matched = files.filter((f) => f.athleteId).length;

  function apply() {
    const map: Record<string, string> = {};
    for (const f of files) if (f.athleteId) map[f.athleteId] = f.url;
    onApply(map);
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg">
      <ModalHeader title="Carica foto squadra" onClose={onClose} />
      <div className="overflow-y-auto p-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background py-10 text-center">
            <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name="upload" size={24} /></span>
            <button onClick={() => inputRef.current?.click()} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Seleziona le foto</button>
            <p className="max-w-sm text-[12px] text-muted">
              Selezionale tutte insieme. Per l&apos;abbinamento automatico nomina i file col <b>cognome</b> del giocatore (es. <code className="rounded bg-surface px-1">simeone.jpg</code>). Quelle non riconosciute le assegni a mano qui.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-muted"><b className="text-foreground">{matched}</b>/{files.length} foto abbinate automaticamente — controlla e correggi.</div>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <span className="hidden w-32 shrink-0 truncate text-[12px] text-muted sm:block" title={f.name}>{f.name}</span>
                  <select
                    className="inp flex-1"
                    value={f.athleteId}
                    onChange={(e) => setFiles((arr) => arr.map((x, j) => (j === i ? { ...x, athleteId: e.target.value } : x)))}
                  >
                    <option value="">— non assegnare —</option>
                    {athletes.map((a) => <option key={a.id} value={a.id}>{a.lastName} {a.firstName} · #{a.shirtNumber}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        <div className="mt-6 flex items-center gap-2">
          {files.length > 0 && (
            <button onClick={() => inputRef.current?.click()} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-background">+ Altre foto</button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
            <button onClick={apply} disabled={matched === 0} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {loading ? "Caricamento…" : `Applica${matched > 0 ? ` (${matched})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function age(b: string) {
  return Math.floor((Date.parse("2026-06-22") - Date.parse(b)) / (365.25 * 86400000));
}
