import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps, getEvents, getSeedAttendance, isoDay } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CaricoPlanned } from "@/components/carico/CaricoPlanned";

const DAY = 86400000;

export default async function CaricoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = getGps(clientId);
  const today = Date.parse(isoDay(0) + "T00:00:00");
  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const lastDate = dates[dates.length - 1];

  // Per atleta: carico settimanale (sRPE 7gg) e variazione vs settimana precedente
  const rows = athletes.map((a) => {
    const recs = gps.filter((g) => g.athleteId === a.id);
    const week = (from: number, to: number) => recs.filter((g) => { const dd = today - Date.parse(g.date + "T00:00:00"); return dd >= from * DAY && dd < to * DAY; }).reduce((s, g) => s + g.sRPE, 0);
    const thisWeek = week(0, 7);
    const prevWeek = week(7, 14);
    const sessions = recs.filter((g) => today - Date.parse(g.date + "T00:00:00") < 7 * DAY).length;
    const delta = prevWeek ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null;
    return { a, thisWeek, prevWeek, sessions, delta, last: recs.sort((m, n) => n.date.localeCompare(m.date))[0] };
  }).filter((r) => r.last).sort((x, y) => y.thisWeek - x.thisWeek);

  const maxWeek = Math.max(1, ...rows.map((r) => r.thisWeek));
  const teamWeek = rows.reduce((s, r) => s + r.thisWeek, 0);

  // Trend squadra interno vs esterno
  const trend = dates.map((d) => {
    const recs = gps.filter((g) => g.date === d);
    return { date: d, internal: recs.reduce((s, g) => s + g.sRPE, 0), external: recs.reduce((s, g) => s + g.playerLoad, 0), isMatch: recs.some((g) => g.durationMin > 90) };
  });
  const maxInt = Math.max(1, ...trend.map((t) => t.internal));
  const maxExt = Math.max(1, ...trend.map((t) => t.external));
  const todays = gps.filter((g) => g.date === lastDate);
  const teamSRPE = todays.reduce((s, g) => s + g.sRPE, 0);
  const teamPL = todays.reduce((s, g) => s + g.playerLoad, 0);

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Carico" subtitle="Pianificato (dal calendario) vs misurato (GPS/HR) — settimanale e per atleta" icon="load" />

      {/* PIANIFICATO — alimentato dal calendario e dalle presenze */}
      <CaricoPlanned clientId={clientId} athletes={athletes} seedEvents={getEvents(clientId)} seedAttendance={getSeedAttendance(clientId)} />

      {/* MISURATO — GPS / HR da dispositivi */}
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-2"><Icon name="live" size={15} className="brand-text" /> Carico misurato · GPS / HR</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Carico settimanale" value={teamWeek.toLocaleString("it-IT")} hint="sRPE squadra · 7 giorni" tone="brand" icon="trend" />
        <StatCard label="Carico interno" value={teamSRPE.toLocaleString("it-IT")} hint="sRPE · ultima seduta" icon="load" />
        <StatCard label="Carico esterno" value={teamPL.toLocaleString("it-IT")} hint="PlayerLoad · ultima seduta" tone="good" icon="live" />
        <StatCard label="Atleti tracciati" value={rows.length} icon="users" />
      </div>

      {/* Carico settimanale per atleta */}
      <Panel title="Carico settimanale per atleta" className="mb-6" action={<span className="text-[11px] text-muted-2">sRPE ultimi 7 giorni · variazione vs settimana prec.</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Atleta</th>
                <th className="px-3 py-2.5 font-semibold">Carico settimana</th>
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
          Carico interno = sRPE (durata × RPE). Variazioni settimanali ampie e improvvise (&gt;15%) meritano attenzione nella progressione del carico.
        </p>
      </Panel>

      {/* Trend squadra */}
      <Panel title="Andamento carico squadra · interno vs esterno" action={<Legend />} className="mb-6">
        <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
          {trend.map((t) => (
            <div key={t.date} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div className="brand-bg w-1/2 rounded-t" style={{ height: `${(t.internal / maxInt) * 100}%` }} title={`Interno ${t.internal} AU`} />
                <div className="w-1/2 rounded-t bg-good" style={{ height: `${(t.external / maxExt) * 100}%` }} title={`Esterno ${t.external}`} />
              </div>
              <span className={`text-[10px] ${t.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{t.isMatch ? "GARA" : `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}`}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Dettaglio GPS/HR */}
      <Panel title="Dettaglio per atleta · ultima seduta">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2 font-semibold">Atleta</th>
                <th className="brand-text border-l border-border px-4 py-1.5 text-center font-bold" colSpan={5}>Esterno · GPS</th>
                <th className="border-l border-border px-4 py-1.5 text-center font-bold text-good" colSpan={4}>Interno · RPE + HR</th>
              </tr>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-1.5"></th>
                <th className="border-l border-border px-3 py-1.5 font-medium">Dist.</th>
                <th className="px-3 py-1.5 font-medium">Alta vel.</th>
                <th className="px-3 py-1.5 font-medium">Sprint</th>
                <th className="px-3 py-1.5 font-medium">Acc/Dec</th>
                <th className="px-3 py-1.5 font-medium">P.Load</th>
                <th className="border-l border-border px-3 py-1.5 font-medium">sRPE</th>
                <th className="px-3 py-1.5 font-medium">RPE</th>
                <th className="px-3 py-1.5 font-medium">TRIMP</th>
                <th className="px-3 py-1.5 font-medium">FC m/M · Z4/Z5</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, last: g }) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-2.5 font-medium">{a.lastName}</td>
                  <td className="border-l border-border px-3 py-2.5 font-mono text-muted">{(g!.totalDistanceM / 1000).toFixed(1)}km</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.highSpeedM}m</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.sprintCount}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.accelerations}/{g!.decelerations}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{g!.playerLoad}</td>
                  <td className="border-l border-border px-3 py-2.5 font-mono font-semibold">{g!.sRPE}</td>
                  <td className="px-3 py-2.5"><RpeChip rpe={g!.rpe} /></td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.trimp}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[12px] text-muted">{g!.avgHr}/{g!.maxHr}</span>
                    <span className="ml-2 inline-flex gap-1">
                      <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">{g!.hrZone4Min}′</span>
                      <span className="rounded bg-red-100 px-1 text-[10px] font-medium text-red-700">{g!.hrZone5Min}′</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-3 text-[12px] text-muted">
      <span className="flex items-center gap-1.5"><span className="brand-bg h-2.5 w-2.5 rounded-sm" /> Interno (sRPE)</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-good" /> Esterno (PlayerLoad)</span>
    </div>
  );
}
function RpeChip({ rpe }: { rpe: number }) {
  const color = rpe >= 8 ? "#dc2626" : rpe >= 6 ? "#d97706" : "#16a34a";
  return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold text-white" style={{ backgroundColor: color }}>{rpe}</span>;
}
