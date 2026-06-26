"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Athlete, MedicalClosure, MedicalRecord } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useDbCollection } from "@/lib/useDbCollection";
import { useRoster } from "@/lib/useRoster";
import { usePhotos } from "@/lib/usePhotos";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Panel, StatCard } from "@/components/ui";
import { MedHeader } from "@/components/medica/MedHeader";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "2-digit" }) : "—");
const SEV_COLOR: Record<string, string> = { lieve: "var(--elite)", moderato: "var(--warn)", grave: "var(--bad)" };
const SEV_ORDER = ["lieve", "moderato", "grave"];
const daysBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));
const round = (n: number) => Math.round(n * 10) / 10;

// Stagione sportiva: lug → giu. Una data di luglio 2025 appartiene a "2025/26".
const seasonOf = (iso: string) => {
  const d = new Date(iso);
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
};

type Row = { m: MedicalRecord; end: string; days: number; recidiva: boolean };

export function StoricoClient({ clientId, seedAthletes, seedMedical }: { clientId: string; seedAthletes: Athlete[]; seedMedical: MedicalRecord[] }) {
  const { athletes } = useRoster(clientId, seedAthletes);
  const { photos } = usePhotos(clientId);
  const { items: localMedical } = useDbCollection<MedicalRecord>(`medical:${clientId}`);
  const { items: closures } = useDbCollection<MedicalClosure>(`medical-closed:${clientId}`);

  const closureMap = useMemo(() => new Map(closures.map((c) => [c.id, c])), [closures]);
  const ath = (id: string) => athletes.find((a) => a.id === id);

  const allRecords = useMemo<Row[]>(() => {
    const base = [...seedMedical, ...localMedical]
      .filter((m) => m.phase === "conclusa" || closureMap.has(m.id))
      .map((m) => {
        const cl = closureMap.get(m.id);
        const end = m.returnedAt ?? cl?.closedAt ?? m.expectedReturn ?? m.date;
        return { m, end, days: m.daysOut ?? daysBetween(m.date, end) };
      });

    // Recidiva = ricaduta sullo stesso distretto già infortunato in passato (stesso atleta).
    // Si valuta cronologicamente su tutto lo storico, non solo sulla stagione filtrata.
    const seen = new Set<string>();
    const recidivaIds = new Set<string>();
    [...base]
      .sort((a, b) => a.m.date.localeCompare(b.m.date))
      .forEach((r) => {
        const key = `${r.m.athleteId}|${(r.m.bodyPart ?? "").trim().toLowerCase()}`;
        if (seen.has(key)) recidivaIds.add(r.m.id);
        seen.add(key);
      });

    return base
      .map((r) => ({ ...r, recidiva: recidivaIds.has(r.m.id) }))
      .sort((a, b) => b.end.localeCompare(a.end));
  }, [seedMedical, localMedical, closureMap]);

  // Stagioni presenti (per data di insorgenza dell'infortunio), più recente prima.
  const seasons = useMemo(() => Array.from(new Set(allRecords.map((r) => seasonOf(r.m.date)))).sort((a, b) => b.localeCompare(a)), [allRecords]);
  const [season, setSeason] = useState<string | null>(null);
  const activeSeason = season ?? seasons[0] ?? null;

  const records = useMemo(() => (activeSeason ? allRecords.filter((r) => seasonOf(r.m.date) === activeSeason) : allRecords), [allRecords, activeSeason]);

  const atleti = new Set(records.map((r) => r.m.athleteId)).size;
  const giorni = records.reduce((s, r) => s + r.days, 0);
  const rientroMedio = records.length ? round(giorni / records.length) : 0;
  const recidive = records.filter((r) => r.recidiva).length;

  // Anima le barre alla prima comparsa; al cambio stagione transizionano da sole.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Distribuzione per gravità: n. episodi, quota %, giorni medi di stop.
  const perSeverita = useMemo(() => {
    const tot = records.length || 1;
    return SEV_ORDER.map((sev) => {
      const rows = records.filter((r) => r.m.severity === sev);
      const sum = rows.reduce((s, r) => s + r.days, 0);
      return { sev, count: rows.length, pct: Math.round((rows.length / tot) * 100), avg: rows.length ? round(sum / rows.length) : 0 };
    }).filter((x) => x.count > 0);
  }, [records]);

  // Carico per distretto: n. episodi e giorni medi di stop, ordinati per giorni medi.
  const perZona = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    records.forEach((r) => {
      const k = r.m.bodyPart?.trim();
      if (!k || k === "—") return; // es. malattie: nessun distretto anatomico
      const e = map.get(k) ?? { count: 0, sum: 0 };
      e.count++;
      e.sum += r.days;
      map.set(k, e);
    });
    return Array.from(map, ([zona, v]) => ({ zona, count: v.count, avg: round(v.sum / v.count) }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 6);
  }, [records]);

  const maxAvg = Math.max(1, ...perZona.map((z) => z.avg));

  return (
    <div className="mx-auto max-w-[1000px] fade-up">
      <MedHeader section="Memoria stagionale" title="Storico infortuni" subtitle="Archivio degli infortuni conclusi, raggruppato per stagione sportiva" icon="calendar" />

      {seasons.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-medium text-muted-2">Stagione</span>
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${s === activeSeason ? "brand-bg text-white shadow-sm" : "border border-[var(--border)] text-muted hover:text-fg"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Episodi conclusi" value={records.length} tone="brand" icon="medical" />
        <StatCard label="Rientro medio" value={`${rientroMedio} gg`} hint="tempo medio di stop" icon="stopwatch" />
        <StatCard label="Atleti coinvolti" value={atleti} icon="users" />
        <StatCard label="Recidive" value={recidive} tone={recidive > 0 ? "warn" : "default"} hint="stessa zona, stesso atleta" icon="medical" />
      </div>

      {records.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Distribuzione per gravità">
            <div className="p-4">
              {perSeverita.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-muted">Gravità non classificata.</div>
              ) : (
                <>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    {perSeverita.map(({ sev, count, avg, pct }) => (
                      <div
                        key={sev}
                        title={`${sev[0].toUpperCase()}${sev.slice(1)} · ${count} ${count === 1 ? "episodio" : "episodi"} · ${avg} gg medi · ${pct}%`}
                        className="h-full cursor-default transition-[width] duration-700 ease-out hover:brightness-110"
                        style={{ width: mounted ? `${pct}%` : 0, backgroundColor: SEV_COLOR[sev] }}
                      />
                    ))}
                  </div>
                  <div className="mt-5 space-y-3.5">
                    {perSeverita.map(({ sev, count, avg }) => (
                      <div key={sev} className="flex items-center gap-3 text-[13px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SEV_COLOR[sev] }} />
                        <span className="w-24 shrink-0 font-semibold capitalize">{sev}</span>
                        <span className="text-muted-2">{count} {count === 1 ? "episodio" : "episodi"}</span>
                        <span className="ml-auto shrink-0 whitespace-nowrap tnum">
                          <span className="font-bold">{avg}</span> <span className="text-muted-2">gg medi</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Giorni medi di stop per distretto">
            <div className="space-y-4 p-4">
              {perZona.map(({ zona, count, avg }, i) => (
                <div
                  key={zona}
                  title={`${zona} · ${count} ${count === 1 ? "episodio" : "episodi"} · ${avg} gg medi di stop`}
                  className="group grid cursor-default grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1.5 text-[13px]"
                >
                  <span className="truncate font-medium">{zona}</span>
                  <span className="shrink-0 whitespace-nowrap tnum">
                    <span className="font-bold">{avg}</span> <span className="text-muted-2">gg · {count} ep.</span>
                  </span>
                  <div className="col-span-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="brand-bg h-full rounded-full transition-[width] duration-700 ease-out group-hover:brightness-110"
                      style={{ width: mounted ? `${(avg / maxAvg) * 100}%` : 0, transitionDelay: `${i * 70}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {records.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">Nessun infortunio concluso in questa stagione.</div>
      ) : (
        <div className="space-y-3">
          {records.map(({ m, end, days, recidiva }) => {
            const a = ath(m.athleteId);
            const sevC = m.severity ? SEV_COLOR[m.severity] : "var(--muted-2)";
            return (
              <div key={m.id} className="card flex items-start gap-4 p-4">
                {a && <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} size={46} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a ? <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-bold hover:underline">{a.firstName} {a.lastName}</Link> : <span className="font-bold">—</span>}
                    {m.severity && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" style={{ color: sevC, backgroundColor: `color-mix(in srgb, ${sevC} 12%, transparent)` }}>{m.severity}</span>}
                    {recidiva && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><Icon name="refresh" size={11} /> Recidiva</span>}
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Icon name="sparkle" size={11} /> Concluso</span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted">{m.injury} · {m.bodyPart}{m.mechanism ? ` · ${m.mechanism}` : ""}</div>
                  <div className="mt-1.5 text-[12px] text-muted-2 tnum">{fmt(m.date)} → {fmt(end)} · {days} gg di stop</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
