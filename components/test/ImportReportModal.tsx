"use client";

import { useMemo, useState } from "react";
import type { Athlete, AthleteTestSession, PhysicalKpi } from "@/lib/types";
import { useRoster } from "@/lib/useRoster";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { dbUpsertMany } from "@/lib/db/actions";
import { matchAthlete, type ParsedReport } from "@/lib/testReport";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";

const fmtDate = (iso: string | null) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—");
const kpiLabel = (v: number | null | undefined) => (v == null ? "n/d" : String(v));
const KPI_KEYS: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];

/** Calcola il P-Index composito (stessa formula del resto dell'app). */
function pIndexOf(k: PhysicalKpi) {
  return Math.max(1, Math.min(100, Math.round(0.3 * k.forza + 0.32 * k.potenza + 0.23 * k.reattivita + 0.15 * k.simmetria)));
}

/**
 * Verifica e importazione di un report di valutazione neuromuscolare.
 * Mostra TUTTO ciò che è stato letto (atleta → KPI + test + sessioni) e lo salva
 * solo dopo conferma esplicita: nessun valore tocca un profilo senza che l'utente
 * l'abbia visto. Salva lo storico (athlete-tests) e aggiorna il radar (override).
 */
export function ImportReportModal({ clientId, seedAthletes, parsed, fileName, onClose, onDone }: {
  clientId: string; seedAthletes: Athlete[]; parsed: ParsedReport; fileName: string; onClose: () => void; onDone: (n: number) => void;
}) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { setOverride } = useAthleteEdits(clientId);
  const [busy, setBusy] = useState(false);

  const rosterLite = useMemo(() => athletes.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, shirtNumber: a.shirtNumber })), [athletes]);
  const athById = useMemo(() => new Map(athletes.map((a) => [a.id, a])), [athletes]);

  // Abbinamento iniziale automatico (per nome), modificabile a mano.
  const [assign, setAssign] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const pa of parsed.athletes) m[pa.reportName] = matchAthlete(pa.reportName, rosterLite) ?? "";
    return m;
  });

  const sorted = useMemo(() => [...rosterLite].sort((a, b) => a.shirtNumber - b.shirtNumber), [rosterLite]);
  const matchedCount = parsed.athletes.filter((p) => assign[p.reportName]).length;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const sessions: AthleteTestSession[] = [];
    for (const pa of parsed.athletes) {
      const aid = assign[pa.reportName];
      if (!aid) continue;
      for (const s of pa.sessions) {
        const date = s.date ?? parsed.reportDate;
        if (!date) continue;
        sessions.push({
          id: `${clientId}-ts-${aid}-${date}`, clientId, athleteId: aid, date, source: fileName,
          kpi: s.active ? pa.kpi : null, measures: s.tests,
        });
      }
      // Radar: aggiorna il profilo con i KPI del report (assi mancanti = tenuti dal profilo attuale).
      const k = pa.kpi;
      const cur = athById.get(aid)?.profile;
      if (k && cur && KPI_KEYS.some((key) => k[key] != null)) {
        const merged: PhysicalKpi = {
          forza: k.forza ?? cur.forza, potenza: k.potenza ?? cur.potenza,
          reattivita: k.reattivita ?? cur.reattivita, simmetria: k.simmetria ?? cur.simmetria,
        };
        const newProfile = {
          ...merged, pIndex: k.pIndex ?? pIndexOf(merged),
          prev: { forza: cur.forza, potenza: cur.potenza, reattivita: cur.reattivita, simmetria: cur.simmetria, pIndex: cur.pIndex },
        };
        setOverride(aid, { profile: newProfile });
      }
    }
    try { if (sessions.length) await dbUpsertMany(`athlete-tests:${clientId}`, sessions); } catch { /* riallineo al prossimo load */ }
    setBusy(false);
    onDone(parsed.athletes.filter((p) => assign[p.reportName]).length);
  }

  return (
    <Modal onClose={onClose} size="xl">
      <ModalHeader
        title="Verifica valutazione neuromuscolare"
        subtitle={`Report del ${fmtDate(parsed.reportDate)} · ${parsed.athletes.length} giocatori trovati`}
        onClose={onClose}
      />
      <div className="border-b border-border bg-brand-soft px-6 py-2.5 text-[12px] text-foreground/80">
        <Icon name="sparkle" size={14} className="brand-text -mt-0.5 mr-1 inline" />
        Controlla i valori letti dal file. Verranno salvati nello <b>storico</b> di ogni giocatore e aggiorneranno il suo <b>radar</b> solo dopo la tua conferma. «n/d» = test non eseguito in quella sessione.
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
              <th className="px-4 py-2.5 font-semibold">Giocatore (nel report)</th>
              <th className="px-3 py-2.5 font-semibold">Atleta in rosa</th>
              <th className="px-2 py-2.5 text-center font-semibold">F</th>
              <th className="px-2 py-2.5 text-center font-semibold">P</th>
              <th className="px-2 py-2.5 text-center font-semibold">R</th>
              <th className="px-2 py-2.5 text-center font-semibold">S</th>
              <th className="px-2 py-2.5 text-center font-semibold">P-Idx</th>
              <th className="px-3 py-2.5 text-center font-semibold">Test · Sessioni</th>
            </tr>
          </thead>
          <tbody>
            {parsed.athletes.map((pa) => {
              const aid = assign[pa.reportName];
              const active = pa.sessions.find((s) => s.active) ?? pa.sessions[0];
              const k = pa.kpi;
              return (
                <tr key={pa.reportName} className={`border-b border-border last:border-0 ${!aid ? "bg-amber-50/50" : ""}`}>
                  <td className="px-4 py-2 font-semibold">{pa.reportName}</td>
                  <td className="px-3 py-2">
                    <select value={aid} onChange={(e) => setAssign((m) => ({ ...m, [pa.reportName]: e.target.value }))} className="inp h-8 py-0 text-[13px]">
                      <option value="">— non importare —</option>
                      {sorted.map((a) => <option key={a.id} value={a.id}>#{a.shirtNumber} {a.lastName} {a.firstName}</option>)}
                    </select>
                  </td>
                  <Kpi v={k?.forza} /><Kpi v={k?.potenza} /><Kpi v={k?.reattivita} /><Kpi v={k?.simmetria} /><Kpi v={k?.pIndex} bold />
                  <td className="px-3 py-2 text-center text-[12px] text-muted">{active?.tests.length ?? 0} · {pa.sessions.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
        <div className="text-[13px] text-muted">
          <b className="text-foreground">{matchedCount}</b> di {parsed.athletes.length} abbinati · gli altri verranno saltati
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">Annulla</button>
          <button onClick={confirm} disabled={busy || matchedCount === 0} className="brand-bg brand-on rounded-lg px-5 py-2 text-sm font-bold disabled:opacity-40">
            {busy ? "Salvataggio…" : `Conferma e salva (${matchedCount})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Kpi({ v, bold }: { v: number | null | undefined; bold?: boolean }) {
  const na = v == null;
  return <td className={`px-2 py-2 text-center font-mono ${bold ? "font-bold brand-text" : ""} ${na ? "text-muted-2" : ""}`}>{kpiLabel(v)}</td>;
}
