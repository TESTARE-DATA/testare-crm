"use client";

import Link from "next/link";
import { useState } from "react";
import type { Athlete, InjuryPhase, MedicalClosure, MedicalRecord, MedicalType, PlayerRole } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { useRoster } from "@/lib/useRoster";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { usePhotos } from "@/lib/usePhotos";
import { readinessTier } from "@/lib/readiness-core";
import { statusForPhase } from "@/lib/medical-flow";
import { extractDateFromDataUrl } from "@/lib/fileDate";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

const PHASES: { key: InjuryPhase; step: number; color: string; desc: string }[] = [
  { key: "acuta", step: 1, color: "#dc2626", desc: "Gestione del dolore, scarico" },
  { key: "subacuta", step: 2, color: "#ea580c", desc: "Recupero ROM e carico parziale" },
  { key: "riatletizzazione", step: 3, color: "#d97706", desc: "Forza, corsa, gesto sport-specifico" },
  { key: "return to play", step: 4, color: "#16a34a", desc: "Test funzionali, rientro in gruppo" },
  { key: "conclusa", step: 5, color: "#64748b", desc: "Chiusa, monitoraggio" },
];
const PHASE_COLOR: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.key, p.color]));
const TYPES: MedicalType[] = ["infortunio", "sovraccarico", "malattia", "controllo"];

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "—");
/** Bordo per stato: rosso = infortunato/fermo, arancione = in recupero, verde = disponibile, grigio = a riposo. */
const STATUS_BORDER: Record<string, string> = { infortunato: "var(--bad)", "in valutazione": "#2563eb", "in recupero": "var(--warn)", "a riposo": "var(--muted-2)", disponibile: "var(--good)" };
const borderFor = (status: string) => STATUS_BORDER[status] ?? "var(--good)";
const statusLabel = (status: string) => (status === "in valutazione" ? "In valutazione" : status === "in recupero" ? "In recupero" : status === "infortunato" ? "Fermo" : status === "a riposo" ? "A riposo" : "Disponibile");
const STATUS_ORDER: Record<string, number> = { infortunato: 0, "in valutazione": 1, "in recupero": 2, "a riposo": 3, disponibile: 4 };

export function AreaMedicaClient({ clientId, seed, athletes: seedAthletes, readiness }: { clientId: string; seed: MedicalRecord[]; athletes: Athlete[]; readiness: Record<string, number> }) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: local, add, remove } = useDbCollection<MedicalRecord>(`medical:${clientId}`);
  const { items: localAthletes, update: updateAthlete } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`);
  const { setOverride } = useAthleteEdits(clientId);
  const [view, setView] = useState<"cartelle" | "fase">("cartelle");
  const [open, setOpen] = useState(false);

  const localAthIds = new Set(localAthletes.map((a) => a.id));

  function addRecord(m: MedicalRecord) {
    add(m);
    const s = statusForPhase(m.phase);
    if (localAthIds.has(m.athleteId)) updateAthlete(m.athleteId, { status: s });
    else setOverride(m.athleteId, { status: s });
  }

  const all = [...seed, ...local];
  const localIds = new Set(local.map((m) => m.id));
  const closedIds = new Set(closures.map((c) => c.id));
  const activeByAthlete = new Map<string, MedicalRecord>();
  for (const m of all) {
    if (m.phase === "conclusa" || closedIds.has(m.id)) continue;
    const cur = activeByAthlete.get(m.athleteId);
    if (!cur || m.date > cur.date) activeByAthlete.set(m.athleteId, m);
  }

  // Tutta la rosa, con eventuale cartella attiva; in cura prima per reparto.
  const roster = athletes
    .map((a) => ({ athlete: a, record: activeByAthlete.get(a.id) }))
    .sort((x, y) => (STATUS_ORDER[x.athlete.status] ?? 3) - (STATUS_ORDER[y.athlete.status] ?? 3) || x.athlete.shirtNumber - y.athlete.shirtNumber);

  const inCare = roster.filter((x) => x.athlete.status === "infortunato" || x.athlete.status === "in recupero" || x.record);
  const fermi = inCare.filter((x) => x.athlete.status === "infortunato" || (x.record && x.athlete.status !== "in recupero" && x.athlete.status !== "in valutazione")).length;
  const recupero = inCare.filter((x) => x.athlete.status === "in recupero").length;
  const rientri = inCare.filter((x) => x.record?.expectedReturn).length;

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <MedHeader
        clientId={clientId}
        seedCount={seedAthletes.length}
        section="Quadro clinico"
        title="Overview"
        subtitle="Stato clinico dell'intera rosa per reparto"
        icon="medical"
        actions={
          <>
            <div className="flex rounded-xl border border-border bg-surface p-0.5">
              <ToggleBtn active={view === "cartelle"} onClick={() => setView("cartelle")} icon="users">Cartelle</ToggleBtn>
              <ToggleBtn active={view === "fase"} onClick={() => setView("fase")} icon="layers">Per fase</ToggleBtn>
            </div>
            <button onClick={() => setOpen(true)} className="med-accent-bg flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"><Icon name="upload" size={16} /> Aggiungi cartella</button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Atleti in cura" value={inCare.length} tone="warn" icon="medical" />
        <StatCard label="Fermi" value={fermi} tone="warn" />
        <StatCard label="In recupero" value={recupero} tone="good" />
        <StatCard label="Rientri previsti" value={rientri} icon="calendar" />
      </div>

      {view === "cartelle" ? (
        <RosterView clientId={clientId} groups={roster} photos={photos} readiness={readiness} />
      ) : (
        <PhaseBoard clientId={clientId} all={all} athletes={athletes} localIds={localIds} onRemove={remove} />
      )}

      {open && <AddRecordModal clientId={clientId} athletes={athletes} onClose={() => setOpen(false)} onAdd={addRecord} />}
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${active ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
      <Icon name={icon} size={14} /> {children}
    </button>
  );
}

// ---- Vista Cartelle: griglia stile Rosa con bordi colorati -------------------
function RosterView({ clientId, groups, photos, readiness }: { clientId: string; groups: { athlete: Athlete; record?: MedicalRecord }[]; photos: Record<string, string>; readiness: Record<string, number> }) {
  return (
    <>
      {ROLES.map((role) => {
        const list = groups.filter((g) => g.athlete.role === role);
        if (list.length === 0) return null;
        return (
          <section key={role} className="mb-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {role} <span className="rounded-full bg-background px-2 py-0.5 text-[12px]">{list.length}</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ athlete: a, record: m }) => <MedicalCard key={a.id} clientId={clientId} athlete={a} record={m} photo={photos[a.id]} rd={readiness[a.id]} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}

function MedicalCard({ clientId, athlete: a, record: m, photo, rd }: { clientId: string; athlete: Athlete; record?: MedicalRecord; photo?: string; rd?: number }) {
  const color = borderFor(a.status);
  const tier = rd != null ? readinessTier(rd) : null;
  return (
    <Link
      href={`${sectionHref(clientId, "rosa")}/${a.id}`}
      className="card card-hover relative block overflow-hidden p-3.5"
      style={{ borderColor: color, borderWidth: 2, backgroundColor: `color-mix(in srgb, ${color} 5%, var(--surface))` }}
    >
      <div className="flex items-center gap-3.5">
        <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photo ?? a.photoUrl} shirtNumber={a.shirtNumber} size={64} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{a.firstName} {a.lastName}</div>
          <div className="truncate text-[12px] text-muted">{a.role} · #{a.shirtNumber}</div>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} /> {statusLabel(a.status)}
          </span>
        </div>
        <div className="shrink-0 text-right">
          {tier ? (
            <>
              <div className="text-2xl font-extrabold leading-none" style={{ color: tier.color }}>{rd}<span className="text-sm">%</span></div>
              <div className="text-[9px] uppercase tracking-wide text-muted-2">Readiness</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold leading-none text-muted-2">—</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-2">Readiness</div>
            </>
          )}
        </div>
      </div>

      {m ? (
        <div className="mt-3 border-t border-border pt-2.5">
          <div className="flex items-start gap-1.5">
            <Icon name="medical" size={14} className="mt-0.5 shrink-0" style={{ color }} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-tight">{m.injury}</div>
              <div className="truncate text-[11px] text-muted">{m.bodyPart}{m.severity ? ` · ${m.severity}` : ""}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-medium capitalize text-muted" style={{ borderColor: `color-mix(in srgb, ${PHASE_COLOR[m.phase] ?? color} 40%, transparent)`, color: PHASE_COLOR[m.phase] ?? color }}>{m.phase}</span>
            {m.expectedReturn && <span className="flex items-center gap-1 text-muted"><Icon name="calendar" size={11} /> rientro {fmt(m.expectedReturn)}</span>}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5 text-[12px] text-muted">
          <Icon name={a.status === "a riposo" ? "moon" : "sparkle"} size={13} style={{ color }} />
          {a.status === "a riposo" ? "A riposo · nessuna criticità clinica." : "Arruolabile · nessuna cartella attiva."}
        </div>
      )}
    </Link>
  );
}

// ---- Vista Per fase: board (kanban) -----------------------------------------
function PhaseBoard({ clientId, all, athletes, localIds, onRemove }: { clientId: string; all: MedicalRecord[]; athletes: Athlete[]; localIds: Set<string>; onRemove: (id: string) => void }) {
  const ath = (id: string) => athletes.find((x) => x.id === id);
  const phases = PHASES.filter((ph) => ph.key !== "conclusa");
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {phases.map((ph) => {
        const list = all.filter((m) => m.phase === ph.key);
        return (
          <div key={ph.key} className="rounded-2xl bg-background/60 p-2.5">
            <div className="mb-2.5 flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: ph.color }}>{ph.step}</span>
              <div className="flex-1">
                <div className="text-[13px] font-bold capitalize">{ph.key}</div>
                <div className="text-[10px] text-muted-2">fase {ph.step}/4</div>
              </div>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-2 py-4 text-center text-[11px] text-muted-2">{ph.desc}</div>
              ) : (
                list.map((m) => {
                  const a = ath(m.athleteId);
                  return (
                    <div key={m.id} className="card group p-2.5" style={{ borderColor: ph.color, borderWidth: 2, backgroundColor: `color-mix(in srgb, ${ph.color} 5%, var(--surface))` }}>
                      <div className="flex items-center gap-2">
                        {a && <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={a.photoUrl} size={30} />}
                        <div className="min-w-0 flex-1">
                          {a ? <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="block truncate text-[13px] font-bold hover:underline">{a.lastName}</Link> : <span className="text-[13px] font-bold">—</span>}
                          <div className="truncate text-[10px] uppercase tracking-wide text-muted-2">{m.type}</div>
                        </div>
                        {localIds.has(m.id) && <button onClick={() => onRemove(m.id)} className="text-muted-2 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100" title="Elimina">✕</button>}
                      </div>
                      <div className="mt-1.5 text-[12px] font-medium leading-snug">{m.injury}</div>
                      <div className="text-[11px] text-muted">{m.bodyPart}</div>
                      <div className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-muted"><span className="font-medium text-foreground/70">→ </span>{m.treatment}</div>
                      {m.expectedReturn && m.phase !== "conclusa" && (
                        <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: ph.color }}><Icon name="calendar" size={11} /> rientro {fmt(m.expectedReturn)}</div>
                      )}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {m.attachments.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noopener" className="brand-soft-bg brand-text flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium hover:underline" title={att.name}>
                              <Icon name="medical" size={10} /> Referto{att.date ? ` · ${fmt(att.date)}` : ""}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Aggiungi cartella ------------------------------------------------------
function AddRecordModal({ clientId, athletes, onClose, onAdd }: { clientId: string; athletes: Athlete[]; onClose: () => void; onAdd: (m: MedicalRecord) => void }) {
  const [form, setForm] = useState({
    athleteId: athletes[0]?.id ?? "",
    type: "infortunio" as MedicalType,
    injury: "",
    bodyPart: "",
    phase: "acuta" as InjuryPhase,
    treatment: "",
    expectedReturn: "",
  });
  const [attachments, setAttachments] = useState<{ name: string; url: string; date?: string }[]>([]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        setAttachments((a) => [...a, { name: f.name, url, date: extractDateFromDataUrl(url) ?? undefined }]);
      };
      reader.readAsDataURL(f);
    });
  };

  const submit = () => {
    if (!form.injury.trim() || !form.athleteId) return;
    onAdd({
      id: newId(`${clientId}-med`),
      clientId,
      athleteId: form.athleteId,
      type: form.type,
      injury: form.injury,
      bodyPart: form.bodyPart || "—",
      date: new Date().toISOString().slice(0, 10),
      phase: form.phase,
      treatment: form.treatment || "Da definire",
      expectedReturn: form.expectedReturn || undefined,
      attachments: attachments.length ? attachments : undefined,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title="Nuova cartella clinica" onClose={onClose} />
      <div className="overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Atleta" full>
            <select className="inp" value={form.athleteId} onChange={(e) => set("athleteId", e.target.value)}>
              {athletes.map((a) => <option key={a.id} value={a.id}>{a.shirtNumber} · {a.firstName} {a.lastName}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className="inp" value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Fase">
            <select className="inp" value={form.phase} onChange={(e) => set("phase", e.target.value)}>
              {PHASES.map((p) => <option key={p.key} value={p.key}>{p.step} · {p.key}</option>)}
            </select>
          </Field>
          <Field label="Infortunio / diagnosi" full><input className="inp" value={form.injury} onChange={(e) => set("injury", e.target.value)} autoFocus placeholder="es. Lesione I grado bicipite femorale" /></Field>
          <Field label="Zona corporea"><input className="inp" value={form.bodyPart} onChange={(e) => set("bodyPart", e.target.value)} placeholder="es. Coscia post. dx" /></Field>
          <Field label="Rientro stimato"><input type="date" className="inp" value={form.expectedReturn} onChange={(e) => set("expectedReturn", e.target.value)} /></Field>
          <Field label="Trattamento in corso" full><input className="inp" value={form.treatment} onChange={(e) => set("treatment", e.target.value)} placeholder="es. Lavoro eccentrico + reintroduzione corsa" /></Field>
          <Field label="Referti (PDF)" full>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-[var(--brand-primary)] hover:text-foreground">
              <Icon name="upload" size={16} /> Allega referto PDF
              <input type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </label>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px]">
                    <Icon name="medical" size={12} className="brand-text" /> {a.name}
                    <button onClick={() => setAttachments((x) => x.filter((_, j) => j !== i))} className="text-muted-2 hover:text-red-600">✕</button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Salva cartella</button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
