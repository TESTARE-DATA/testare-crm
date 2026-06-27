"use client";

import { useMemo, useState } from "react";
import type { Athlete, DiaryEntryKind, MedicalClosure, MedicalIntake, MedicalRecord, PhysioDiaryEntry, RehabItem, StaffMember } from "@/lib/types";
import { newId } from "@/lib/store";
import { useDbCollection } from "@/lib/useDbCollection";
import { useRoster } from "@/lib/useRoster";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { usePhotos } from "@/lib/usePhotos";
import { areaOfRole } from "@/lib/medical";
import { caseStage } from "@/lib/medical-flow";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";
import { IntakeScheda } from "@/components/medica/IntakeScheda";

const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
const painColor = (p: number) => (p >= 7 ? "var(--bad)" : p >= 4 ? "var(--warn)" : "var(--good)");
const funcColor = (f: number) => (f >= 7 ? "var(--good)" : f >= 4 ? "var(--warn)" : "var(--bad)"); // funzione: più alto = meglio
const VISITA_COLOR = "#7c3aed"; // viola: distingue una visita medica dalle sedute di trattamento

export function DiarioClient({ clientId, seedAthletes, seedMedical, seedIntakes, seedEntries, initialMedical, initialIntakes, initialClosures, initialEntries, rehabItems, staff }: {
  clientId: string; seedAthletes: Athlete[]; seedMedical: MedicalRecord[]; seedIntakes: MedicalIntake[]; seedEntries: PhysioDiaryEntry[]; initialMedical?: MedicalRecord[]; initialIntakes?: MedicalIntake[]; initialClosures?: MedicalClosure[]; initialEntries?: PhysioDiaryEntry[]; rehabItems: RehabItem[]; staff: StaffMember[];
}) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: localAthletes, update: updateAthlete } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { setOverride } = useAthleteEdits(clientId);
  const { items: localEntries, add: addEntry, remove: removeEntry } = useDbCollection<PhysioDiaryEntry>(`physio-diary:${clientId}`, initialEntries);
  const { items: localMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`, initialMedical);
  const { items: localIntakes } = useDbCollection<MedicalIntake>(`intake:${clientId}`, initialIntakes);
  const { items: closures, add: addClosure } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`, initialClosures);

  const [openAthlete, setOpenAthlete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState<{ record: MedicalRecord; athlete: Athlete } | null>(null);

  const ath = (id: string) => athletes.find((a) => a.id === id);
  const localEntryIds = new Set(localEntries.map((e) => e.id));
  const intakeMap = useMemo(() => new Map([...seedIntakes, ...localIntakes].map((i) => [i.id, i])), [seedIntakes, localIntakes]);
  const closedIds = useMemo(() => new Set(closures.map((c) => c.id)), [closures]);
  const allEntries = useMemo(() => [...seedEntries, ...localEntries], [seedEntries, localEntries]);

  // Atleti in terapia: casi nello stadio "diario" (presi in carico, non chiusi).
  const inTherapy = useMemo(() => {
    const records = [...seedMedical, ...localMedical].filter((m) => caseStage(m, intakeMap.get(m.id), closedIds.has(m.id)) === "diario");
    const byAth = new Map<string, MedicalRecord>();
    for (const r of records) { const cur = byAth.get(r.athleteId); if (!cur || r.date > cur.date) byAth.set(r.athleteId, r); }
    const out: { record: MedicalRecord; athlete: Athlete; intake?: MedicalIntake; entries: PhysioDiaryEntry[] }[] = [];
    for (const record of byAth.values()) {
      const a = ath(record.athleteId);
      if (!a) continue;
      const entries = allEntries.filter((e) => e.athleteId === record.athleteId).sort((x, y) => y.date.localeCompare(x.date));
      out.push({ record, athlete: a, intake: intakeMap.get(record.id), entries });
    }
    return out;
  }, [seedMedical, localMedical, intakeMap, closedIds, allEntries, athletes]);

  const sessioni = inTherapy.reduce((s, x) => s + x.entries.length, 0);
  const selected = inTherapy.find((x) => x.athlete.id === openAthlete) ?? null;

  function saveEntry(e: PhysioDiaryEntry) { addEntry(e); }
  function closePath(record: MedicalRecord, athlete: Athlete) {
    addClosure({ id: record.id, clientId, athleteId: athlete.id, closedAt: new Date().toISOString().slice(0, 10) });
    if (localAthletes.some((a) => a.id === athlete.id)) updateAthlete(athlete.id, { status: "disponibile" });
    else setOverride(athlete.id, { status: "disponibile" });
    setOpenAthlete(null);
  }

  // ----- Dettaglio atleta -----
  if (selected) {
    const a = selected.athlete, m = selected.record;
    return (
      <div className="mx-auto max-w-[1000px] fade-up">
        <button onClick={() => setOpenAthlete(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"><Icon name="arrowLeft" size={15} /> Atleti in terapia</button>

        <div className="card med-topline mb-5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-xl font-extrabold tracking-tight">{a.firstName} {a.lastName}</div>
              <div className="text-[13px] text-muted">{m.injury} · {m.bodyPart}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full med-soft-bg med-accent px-2 py-0.5 font-semibold"><Icon name="users" size={11} /> {selected.intake?.assignedTo ?? "—"}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 capitalize text-muted">{m.phase}</span>
                <span className="text-muted-2">{selected.entries.length} sedute</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAdding(true)} className="med-accent-bg inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white"><Icon name="plus" size={14} /> Nuova seduta</button>
              <button onClick={() => exportPdf(a, m, selected.intake, selected.entries)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-semibold hover:bg-background"><Icon name="upload" size={14} /> Esporta PDF</button>
              <button onClick={() => setClosing({ record: m, athlete: a })} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100"><Icon name="sparkle" size={14} /> Chiudi percorso</button>
            </div>
          </div>
        </div>

        {selected.intake && (
          <div className="card mb-5 p-5">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Icon name="clipboard" size={16} className="med-accent" /> Scheda del medico</div>
            <IntakeScheda intake={selected.intake} record={m} />
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Trattamenti svolti</div>
          {selected.entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nessuna seduta registrata. Aggiungine una.</p>
          ) : (
            <ul className="divide-y divide-border">
              {selected.entries.map((e) => {
                const isVisita = e.kind === "visita";
                return (
                <li key={e.id} className="flex items-center gap-3 py-3 pr-4 pl-4" style={isVisita ? { borderLeft: `3px solid ${VISITA_COLOR}`, paddingLeft: 13, backgroundColor: `color-mix(in srgb, ${VISITA_COLOR} 5%, transparent)` } : undefined}>
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-[11px] font-bold tnum">{fmtShort(e.date)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isVisita && <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ color: VISITA_COLOR, backgroundColor: `color-mix(in srgb, ${VISITA_COLOR} 14%, transparent)` }}><Icon name="medical" size={10} /> Visita</span>}
                      <span className="truncate text-[13px] font-semibold">{e.treatment}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted">{e.area}{e.notes ? ` · ${e.notes}` : ""}{e.author ? ` · ${e.author}` : ""}</div>
                  </div>
                  <OutcomeCell entry={e} />
                  <div className="w-12 shrink-0 text-right text-[12px] text-muted tnum">{e.durationMin}′</div>
                  {localEntryIds.has(e.id) && <button onClick={() => removeEntry(e.id)} title="Elimina" className="text-muted-2 hover:text-red-600">✕</button>}
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {adding && <AddEntryModal clientId={clientId} athlete={a} rehabItems={rehabItems} staff={staff} onClose={() => setAdding(false)} onAdd={saveEntry} />}
        {closing && <ConfirmDialog title="Chiudere il percorso" confirmLabel="Chiudi e rientra in rosa" message={<>Confermi la chiusura del percorso di <b>{a.firstName} {a.lastName}</b>? L&apos;atleta rientra in rosa come disponibile e il caso passa allo storico stagionale.</>} onConfirm={() => closePath(closing.record, closing.athlete)} onClose={() => setClosing(null)} />}
      </div>
    );
  }

  // ----- Prima schermata: atleti in terapia -----
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <MedHeader section="Riabilitazione" title="Diario riabilitativo" subtitle="Atleti presi in carico e in riabilitazione · scheda del medico + sedute" icon="pulse" />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Atleti in terapia" value={inTherapy.length} tone="brand" icon="pulse" />
        <StatCard label="Sedute registrate" value={sessioni} icon="clipboard" />
        <StatCard label="Sedute totali (min)" value={inTherapy.reduce((s, x) => s + x.entries.reduce((t, e) => t + e.durationMin, 0), 0)} tone="good" icon="stopwatch" />
      </div>

      {inTherapy.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="sparkle" size={24} /></span>
          <div className="text-base font-semibold">Nessun atleta in terapia</div>
          <p className="max-w-sm text-sm text-muted">Gli atleti compaiono qui quando vengono presi in carico e affidati a un professionista dalla <b>Presa in carico</b>.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inTherapy.map(({ record: m, athlete: a, intake, entries }) => (
            <button key={a.id} onClick={() => setOpenAthlete(a.id)} className="card card-hover med-topline group flex flex-col p-4 text-left">
              <div className="flex items-center gap-3">
                <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{a.firstName} {a.lastName}</div>
                  <div className="truncate text-[12px] text-muted">{a.role} · #{a.shirtNumber}</div>
                </div>
                <Icon name="chevron" size={16} className="text-muted-2 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3 border-t border-border pt-2.5">
                <div className="truncate text-[13px] font-semibold">{m.injury}</div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full med-soft-bg med-accent px-2 py-0.5 font-semibold"><Icon name="users" size={10} /> {intake?.assignedTo ?? "—"}</span>
                  <span className="text-muted-2">{entries.length} sedute</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Esporta PDF (apre una scheda stampabile) -------------------------------
function exportPdf(a: Athlete, m: MedicalRecord, intake: MedicalIntake | undefined, entries: PhysioDiaryEntry[]) {
  const cell = (pre?: number, post?: number, single?: number) => {
    const end = post ?? single;
    if (end == null && pre == null) return "—";
    return pre != null && post != null ? `${pre}→${post}` : `${end}`;
  };
  const rows = entries.map((e) => `<tr><td>${fmtShort(e.date)}</td><td>${e.kind === "visita" ? '<b style="color:#7c3aed">Visita</b>' : "Seduta"}</td><td>${e.treatment}</td><td>${e.area}</td><td style="text-align:center">${cell(e.painPre, e.painPost, e.pain)}</td><td style="text-align:center">${cell(e.funcPre, e.funcPost)}</td><td style="text-align:right">${e.durationMin}′</td><td>${e.author ?? ""}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Diario ${a.lastName}</title>
  <style>body{font-family:-apple-system,Segoe UI,sans-serif;color:#0f172a;padding:32px;max-width:800px;margin:auto}
  h1{font-size:20px;margin:0} .sub{color:#64748b;font-size:13px;margin:2px 0 16px}
  .meta{display:flex;gap:24px;font-size:13px;margin-bottom:16px} .meta b{display:block;color:#64748b;font-size:11px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
  th{font-size:11px;text-transform:uppercase;color:#64748b} .head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}</style></head>
  <body><div class="head"><div><h1>Diario riabilitativo</h1><div class="sub">${a.firstName} ${a.lastName} · ${a.role} #${a.shirtNumber}</div></div><div style="font-weight:800;letter-spacing:2px">TESTÀRE</div></div>
  <div class="meta"><div><b>Diagnosi</b>${m.injury} · ${m.bodyPart}</div><div><b>Affidato a</b>${intake?.assignedTo ?? "—"}</div><div><b>Sedute</b>${entries.length}</div></div>
  <table><thead><tr><th>Data</th><th>Tipo</th><th>Trattamento</th><th>Area</th><th>Dolore</th><th>Funzione</th><th>Durata</th><th>Operatore</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Nessuna seduta</td></tr>'}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
}

function AddEntryModal({ clientId, athlete, rehabItems, staff, onClose, onAdd }: { clientId: string; athlete: Athlete; rehabItems: RehabItem[]; staff: StaffMember[]; onClose: () => void; onAdd: (e: PhysioDiaryEntry) => void }) {
  const physio = staff.find((s) => s.role.toLowerCase().includes("fisio"))?.name ?? staff[0]?.name ?? "";
  const medico = staff.find((s) => s.role.toLowerCase().includes("medic"))?.name ?? physio;
  const [kind, setKind] = useState<DiaryEntryKind>("seduta");
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), area: "", treatment: "", durationMin: 30, painPre: 3, painPost: 2, funcPre: 5, funcPost: 6, notes: "", author: physio });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isVisita = kind === "visita";

  // Cambiando tipo, propone l'operatore di riferimento (medico per la visita, fisio per la seduta).
  function pickKind(k: DiaryEntryKind) {
    setKind(k);
    set("author", k === "visita" ? medico : physio);
  }

  function submit() {
    if (!form.treatment.trim()) return;
    const member = staff.find((s) => s.name === form.author);
    onAdd({
      id: newId(`${clientId}-diary`), clientId, athleteId: athlete.id, kind, date: form.date,
      area: form.area || "Generale", treatment: form.treatment, durationMin: form.durationMin,
      // Pre/post solo per le sedute di trattamento; la visita è una valutazione.
      ...(isVisita ? {} : { painPre: form.painPre, painPost: form.painPost, funcPre: form.funcPre, funcPost: form.funcPost }),
      notes: form.notes || undefined, author: form.author || undefined, authorArea: member ? areaOfRole(member.role) : undefined,
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title={isVisita ? "Nuova visita" : "Nuova seduta di fisioterapia"} subtitle={`${athlete.firstName} ${athlete.lastName}`} onClose={onClose} accent={isVisita ? VISITA_COLOR : "var(--med)"} />
      <div className="overflow-y-auto p-6">
        <div className="mb-4 flex gap-2">
          <KindBtn active={!isVisita} icon="pulse" label="Seduta" color="var(--med)" onClick={() => pickKind("seduta")} />
          <KindBtn active={isVisita} icon="medical" label="Visita" color={VISITA_COLOR} onClick={() => pickKind("visita")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Compilato da" full>
            <select className="inp" value={form.author} onChange={(e) => set("author", e.target.value)}>
              <option value="">— seleziona —</option>
              {staff.map((s) => <option key={s.name} value={s.name}>{s.name} · {s.role}</option>)}
            </select>
          </Field>
          <Field label="Data"><input type="date" className="inp" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Distretto / area"><input className="inp" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="es. Ginocchio dx" /></Field>
          <Field label={isVisita ? "Esito / motivo della visita" : "Trattamento / esercizio"} full>
            <input className="inp" list={isVisita ? undefined : "rehab-items"} value={form.treatment} onChange={(e) => set("treatment", e.target.value)} placeholder={isVisita ? "es. Controllo ortopedico, eco di controllo…" : "es. Tecarterapia + isometria"} />
            {!isVisita && <datalist id="rehab-items">{rehabItems.map((r) => <option key={r.id} value={r.name} />)}</datalist>}
          </Field>
          <Field label="Durata (min)" full><input type="number" min={0} className="inp" value={form.durationMin} onChange={(e) => set("durationMin", Math.max(0, +e.target.value))} /></Field>
          {!isVisita && (
            <div className="col-span-2 grid grid-cols-2 gap-3 rounded-xl med-soft-bg p-3">
              <div className="col-span-2 flex items-center gap-1.5 text-[12px] font-semibold med-accent"><Icon name="pulse" size={13} /> Risposta alla seduta · pre / post</div>
              <Slider label={`Dolore PRE (NRS): ${form.painPre}/10`} value={form.painPre} onChange={(v) => set("painPre", v)} color={painColor(form.painPre)} />
              <Slider label={`Dolore POST (NRS): ${form.painPost}/10`} value={form.painPost} onChange={(v) => set("painPost", v)} color={painColor(form.painPost)} />
              <Slider label={`Funzione PRE: ${form.funcPre}/10`} value={form.funcPre} onChange={(v) => set("funcPre", v)} color={funcColor(form.funcPre)} />
              <Slider label={`Funzione POST: ${form.funcPost}/10`} value={form.funcPost} onChange={(v) => set("funcPost", v)} color={funcColor(form.funcPost)} />
              <div className="col-span-2 text-[10px] text-muted-2">Funzione (logica PSFS): 0 = nulla · 10 = completa.</div>
            </div>
          )}
          <Field label="Note" full><textarea className="inp min-h-[64px] resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={isVisita ? "Indicazioni, prescrizioni, prossimo controllo…" : "Risposta al trattamento, indicazioni…"} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={submit} disabled={!form.treatment.trim()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: isVisita ? VISITA_COLOR : "var(--med)" }}>{isVisita ? "Salva visita" : "Salva seduta"}</button>
        </div>
      </div>
    </Modal>
  );
}

// Mostra gli esiti pre/post della seduta: Dolore (più basso = meglio) e Funzione (PSFS, più alto = meglio).
function OutcomeCell({ entry: e }: { entry: PhysioDiaryEntry }) {
  const painPost = e.painPost ?? e.pain;
  const hasPain = e.painPre != null || painPost != null;
  const hasFunc = e.funcPre != null || e.funcPost != null;
  if (!hasPain && !hasFunc) return null;
  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px]">
      {hasPain && <Delta label="Dolore" pre={e.painPre} post={painPost} colorOf={painColor} />}
      {hasFunc && <Delta label="Funzione" pre={e.funcPre} post={e.funcPost} colorOf={funcColor} />}
    </div>
  );
}

function Delta({ label, pre, post, colorOf }: { label: string; pre?: number; post?: number; colorOf: (n: number) => string }) {
  const end = post ?? pre;
  if (end == null) return null;
  return (
    <div className="flex items-center gap-1 tnum">
      <span className="text-[9px] uppercase tracking-wide text-muted-2">{label}</span>
      {pre != null && post != null ? (
        <span className="font-semibold">
          <span className="text-muted-2">{pre}</span>
          <span className="text-muted-2"> → </span>
          <span style={{ color: colorOf(post) }}>{post}</span>
        </span>
      ) : (
        <span className="font-semibold" style={{ color: colorOf(end) }}>{end}</span>
      )}
    </div>
  );
}

function KindBtn({ active, icon, label, color, onClick }: { active: boolean; icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors" style={active ? { borderColor: color, color, backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` } : { borderColor: "var(--border)", color: "var(--muted)" }}>
      <Icon name={icon} size={15} /> {label}
    </button>
  );
}

function Slider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      <input type="range" min={0} max={10} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" style={{ accentColor: color }} />
    </label>
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
