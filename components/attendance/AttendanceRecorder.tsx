"use client";

import { useMemo, useState } from "react";
import type { Athlete, AthleteStatus } from "@/lib/types";
import { SESSION_META } from "@/lib/sessions";
import { TYPE_LOAD } from "@/lib/microcycle";
import { objectiveMeta } from "@/lib/objectives";
import { type AttendanceRec, type SessionEntry, medicalDefault, statusSetFor, useAttendance } from "@/lib/attendance";
import { usePhotos } from "@/lib/usePhotos";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";

const fmtLong = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Recorder presenze condiviso: funziona su qualsiasi seduta (evento o lavoro
 *  assegnato), con stati specifici per tipo. Salva su attendance:<clientId>. */
export function AttendanceRecorder({ clientId, session, athletes, seedAttendance, onClose }: {
  clientId: string; session: SessionEntry; athletes: Athlete[]; seedAttendance: AttendanceRec[]; onClose: () => void;
}) {
  const { byId, save } = useAttendance(clientId, seedAttendance);
  const { photos } = usePhotos(clientId);
  const meta = SESSION_META[session.sessionType];
  const isMatch = session.sessionType === "partita";
  const opts = statusSetFor(session.sessionType);
  const objMeta = objectiveMeta(session.objective);

  const roster = useMemo(
    () => athletes.filter((a) => session.rosterIds.includes(a.id)),
    [athletes, session.rosterIds],
  );

  // Aggancio Area Medica: gli indisponibili partono già pre-segnati (lo storico
  // salvato ha la precedenza, così non sovrascrive una scelta manuale).
  const medical = useMemo(() => {
    const m: Record<string, { status: string }> = {};
    for (const a of roster) { const d = medicalDefault(session.sessionType, a.status); if (d) m[a.id] = { status: d }; }
    return m;
  }, [roster, session.sessionType]);

  const stored = byId(session.id)?.entries ?? {};
  const [entries, setEntries] = useState<Record<string, { status: string; minutes?: number }>>(() => ({ ...medical, ...stored }));
  const setStatus = (id: string, status: string) => setEntries((e) => ({ ...e, [id]: { ...e[id], status } }));
  const setMin = (id: string, minutes: number) => setEntries((e) => ({ ...e, [id]: { status: e[id]?.status ?? "subentrato", minutes } }));
  const defStatus = opts?.[0]?.v ?? "presente";
  // "Tutti presente" rispetta gli indisponibili (restano al default medico).
  const allPresent = () => setEntries(Object.fromEntries(roster.map((a) => [a.id, { status: medicalDefault(session.sessionType, a.status) ?? defStatus }])));

  const onSave = () => { save({ id: session.id, entries }); onClose(); };

  const counts = (opts ?? []).map((s) => ({ ...s, n: roster.filter((a) => entries[a.id]?.status === s.v).length }));
  const totMin = roster.reduce((s, a) => s + (entries[a.id]?.minutes ?? 0), 0);

  return (
    <Modal onClose={onClose} size="lg">
      <div className="shrink-0 px-6 py-4 text-white" style={{ backgroundColor: meta.color }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide opacity-85">{meta.label}{session.slot ? ` · ${session.slot}` : ""}{session.time ? ` ${session.time}` : ""}</div>
            <h2 className="text-xl font-bold">{session.title}</h2>
            <div className="mt-0.5 text-[13px] opacity-90">{fmtLong(session.date)}{session.location ? ` · ${session.location}` : ""}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/80 hover:bg-white/15">✕</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5">{roster.length === athletes.length ? "Tutta la squadra" : `Gruppo · ${roster.length} atleti`}</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5">Carico {session.estLoad || TYPE_LOAD[session.sessionType]} AU</span>
          {session.objective && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5">🎯 {session.objective}{objMeta ? ` · ${objMeta.acr}` : ""}</span>}
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 capitalize opacity-90">{session.source === "assignment" ? "assegnato" : "calendario"}</span>
        </div>
      </div>

      {!opts ? (
        <div className="p-6 text-sm text-muted">Giornata di riposo — nessuna presenza da registrare.</div>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-6 py-3">
            {counts.map((c) => (
              <span key={c.v} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium capitalize" style={{ color: c.c, backgroundColor: `${c.c}15` }}><b>{c.n}</b> {c.v}</span>
            ))}
            {isMatch && <span className="ml-auto text-[12px] text-muted">tot. {totMin}′ giocati</span>}
            <button onClick={allPresent} className={`rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium capitalize hover:bg-background ${isMatch ? "" : "ml-auto"}`}>Tutti {defStatus}</button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {roster.map((a) => {
              const cur = entries[a.id]?.status;
              return (
                <div key={a.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-background">
                  <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} shirtNumber={a.shirtNumber} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.lastName} <span className="font-normal text-muted">{a.firstName}</span></span>
                  {a.status !== "disponibile" && <MedBadge status={a.status} />}
                  {isMatch && cur && cur !== "non entrato" && (
                    <input type="number" min={0} max={120} value={entries[a.id]?.minutes ?? ""} onChange={(e) => setMin(a.id, +e.target.value)} placeholder="min" className="w-16 rounded-lg border border-border px-2 py-1 text-center text-[13px]" />
                  )}
                  <div className="flex flex-wrap justify-end gap-1">
                    {opts.map((o) => (
                      <button key={o.v} onClick={() => setStatus(a.id, o.v)} className="rounded-lg px-2 py-1 text-[11px] font-semibold capitalize transition-all" style={cur === o.v ? { backgroundColor: o.c, color: "#fff" } : { backgroundColor: `${o.c}14`, color: o.c }} title={o.v}>{o.v}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Chiudi</button>
            <button onClick={onSave} className="brand-bg brand-on rounded-lg px-4 py-2 text-sm font-semibold">Salva presenze</button>
          </div>
        </>
      )}
    </Modal>
  );
}

const MED_BADGE: Record<string, { label: string; c: string }> = {
  infortunato: { label: "infortunato", c: "#dc2626" },
  "in recupero": { label: "in recupero", c: "#d97706" },
  "a riposo": { label: "a riposo", c: "#64748b" },
};
function MedBadge({ status }: { status: AthleteStatus }) {
  const m = MED_BADGE[status];
  if (!m) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color: m.c, backgroundColor: `${m.c}18` }} title="Stato Area Medica (pre-segnato in automatico)">
      <Icon name="medical" size={11} />{m.label}
    </span>
  );
}
