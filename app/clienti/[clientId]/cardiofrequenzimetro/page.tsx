import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps, isoDay } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { PageHeader, Panel, StatCard } from "@/components/ui";

const DAY = 86400000;

export default async function CardioPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = getGps(clientId);
  const today = Date.parse(isoDay(0) + "T00:00:00");
  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const lastDate = dates[dates.length - 1];

  // Per atleta: TRIMP settimanale (7gg) e variazione vs settimana precedente.
  const rows = athletes.map((a) => {
    const recs = gps.filter((g) => g.athleteId === a.id);
    const week = (from: number, to: number) => recs.filter((g) => { const dd = today - Date.parse(g.date + "T00:00:00"); return dd >= from * DAY && dd < to * DAY; }).reduce((s, g) => s + g.trimp, 0);
    const thisWeek = week(0, 7);
    const prevWeek = week(7, 14);
    const sessions = recs.filter((g) => today - Date.parse(g.date + "T00:00:00") < 7 * DAY).length;
    const delta = prevWeek ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null;
    return { a, thisWeek, prevWeek, sessions, delta, last: recs.sort((m, n) => n.date.localeCompare(m.date))[0] };
  }).filter((r) => r.last).sort((x, y) => y.thisWeek - x.thisWeek);

  const maxWeek = Math.max(1, ...rows.map((r) => r.thisWeek));

  // Squadra · ultima seduta.
  const todays = gps.filter((g) => g.date === lastDate);
  const avgHrTeam = todays.length ? Math.round(todays.reduce((s, g) => s + g.avgHr, 0) / todays.length) : 0;
  const maxHrTeam = todays.length ? Math.max(...todays.map((g) => g.maxHr)) : 0;
  const trimpTeam = todays.reduce((s, g) => s + g.trimp, 0);
  const highIntMin = todays.reduce((s, g) => s + g.hrZone4Min + g.hrZone5Min, 0);

  // Trend TRIMP squadra per giornata.
  const trend = dates.map((d) => {
    const recs = gps.filter((g) => g.date === d);
    return { date: d, trimp: recs.reduce((s, g) => s + g.trimp, 0), isMatch: recs.some((g) => g.durationMin > 90) };
  });
  const maxTrimp = Math.max(1, ...trend.map((t) => t.trimp));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Cardiofrequenzimetro" subtitle="Frequenza cardiaca, TRIMP e tempo nelle zone HR — da cardiofrequenzimetro" icon="pulse" />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="FC media squadra" value={`${avgHrTeam} bpm`} hint="ultima seduta" tone="brand" icon="pulse" />
        <StatCard label="FC max rilevata" value={`${maxHrTeam} bpm`} hint="ultima seduta" icon="trend" />
        <StatCard label="TRIMP totale" value={trimpTeam.toLocaleString("it-IT")} hint="Edwards · ultima seduta" tone="good" icon="load" />
        <StatCard label="Tempo in Z4–Z5" value={`${highIntMin}′`} hint="alta intensità · ultima seduta" tone="warn" icon="stopwatch" />
      </div>

      {/* TRIMP settimanale per atleta */}
      <Panel title="TRIMP settimanale per atleta" className="mb-6" action={<span className="text-[11px] text-muted-2">Training Impulse ultimi 7 giorni · variazione vs settimana prec.</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Atleta</th>
                <th className="px-3 py-2.5 font-semibold">TRIMP settimana</th>
                <th className="px-3 py-2.5 font-semibold">Sett. prec.</th>
                <th className="px-3 py-2.5 font-semibold">Variazione</th>
                <th className="px-3 py-2.5 font-semibold">Sedute</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, thisWeek, prevWeek, sessions, delta }) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-2.5"><Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-medium hover:underline">{a.lastName}</Link></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-background"><div className="brand-bg h-full" style={{ width: `${(thisWeek / maxWeek) * 100}%` }} /></div>
                      <span className="font-mono font-semibold">{thisWeek.toLocaleString("it-IT")}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted">{prevWeek ? prevWeek.toLocaleString("it-IT") : "—"}</td>
                  <td className="px-3 py-2.5">
                    {delta == null ? <span className="text-muted-2">—</span> : (
                      <span className="font-mono font-semibold" style={{ color: Math.abs(delta) <= 15 ? "var(--muted)" : delta > 0 ? "var(--warn)" : "var(--good)" }}>{delta > 0 ? "+" : ""}{delta}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted">{sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-2">
          TRIMP (Edwards) pesa i minuti per zona di frequenza cardiaca: è il carico cardiovascolare interno. Picchi improvvisi (&gt;15%) meritano attenzione.
        </p>
      </Panel>

      {/* Trend TRIMP squadra */}
      <Panel title="Andamento TRIMP squadra" className="mb-6">
        <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
          {trend.map((t) => (
            <div key={t.date} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center">
                <div className="brand-bg w-2/3 rounded-t" style={{ height: `${(t.trimp / maxTrimp) * 100}%` }} title={`TRIMP ${t.trimp}`} />
              </div>
              <span className={`text-[10px] ${t.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{t.isMatch ? "GARA" : `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}`}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Dettaglio cardio per atleta · ultima seduta */}
      <Panel title="Dettaglio cardio per atleta · ultima seduta">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2 font-semibold">Atleta</th>
                <th className="px-3 py-2 font-semibold">FC media</th>
                <th className="px-3 py-2 font-semibold">FC max</th>
                <th className="px-3 py-2 font-semibold">TRIMP</th>
                <th className="px-3 py-2 font-semibold">Z4</th>
                <th className="px-3 py-2 font-semibold">Z5</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, last: g }) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-2.5 font-medium">{a.lastName}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.avgHr} bpm</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.maxHr} bpm</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{g!.trimp}</td>
                  <td className="px-3 py-2.5"><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-medium text-amber-700">{g!.hrZone4Min}′</span></td>
                  <td className="px-3 py-2.5"><span className="rounded bg-red-100 px-1.5 py-0.5 text-[12px] font-medium text-red-700">{g!.hrZone5Min}′</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-2">
          Z4 e Z5 = minuti in soglia e sopra-soglia (alta intensità). FC max è il picco rilevato nella seduta, non la FCmax teorica dell'atleta.
        </p>
      </Panel>
    </div>
  );
}
