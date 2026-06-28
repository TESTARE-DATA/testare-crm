import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps, getEvents, getSeedAttendance, isoDay } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { PageHeader, Panel, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CaricoPlanned } from "@/components/carico/CaricoPlanned";

const DAY = 86400000;
const round1 = (n: number) => Math.round(n * 10) / 10;

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
    // Monotonia & Strain (Foster) sugli ultimi 7 giorni (i giorni di riposo contano 0).
    const daily = Array.from({ length: 7 }, (_, d) => recs.filter((g) => { const dd = today - Date.parse(g.date + "T00:00:00"); return dd >= d * DAY && dd < (d + 1) * DAY; }).reduce((s, g) => s + g.sRPE, 0));
    const mean = daily.reduce((s, v) => s + v, 0) / 7;
    const sd = Math.sqrt(daily.reduce((s, v) => s + (v - mean) ** 2, 0) / 7);
    const monotony = sd > 0 ? mean / sd : 0;
    const strain = Math.round(thisWeek * monotony);
    return { a, thisWeek, prevWeek, sessions, delta, monotony: round1(monotony), strain, last: recs.sort((m, n) => n.date.localeCompare(m.date))[0] };
  }).filter((r) => r.last).sort((x, y) => y.thisWeek - x.thisWeek);

  const maxWeek = Math.max(1, ...rows.map((r) => r.thisWeek));
  const teamWeek = rows.reduce((s, r) => s + r.thisWeek, 0);

  // Trend squadra interno vs esterno
  const trend = dates.map((d) => {
    const recs = gps.filter((g) => g.date === d);
    return { date: d, internal: recs.reduce((s, g) => s + g.sRPE, 0), external: recs.reduce((s, g) => s + g.playerLoad, 0), isMatch: recs.some((g) => g.durationMin > 90) };
  });
  const maxInt = Math.max(1, ...trend.map((t) => t.internal));
  const todays = gps.filter((g) => g.date === lastDate);
  const teamSRPE = todays.reduce((s, g) => s + g.sRPE, 0);

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Carico" subtitle="Carico interno (sRPE): pianificato vs svolto, settimanale e per atleta, con monotonia e strain" icon="load" />

      {/* PIANIFICATO — alimentato dal calendario e dalle presenze */}
      <CaricoPlanned clientId={clientId} athletes={athletes} seedEvents={getEvents(clientId)} seedAttendance={getSeedAttendance(clientId)} />

      {/* MISURATO — sRPE (RPE × durata) */}
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-2"><Icon name="load" size={15} className="brand-text" /> Carico interno · sRPE</h2>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Carico settimanale" value={teamWeek.toLocaleString("it-IT")} hint="sRPE squadra · 7 giorni" tone="brand" icon="trend" />
        <StatCard label="Carico ultima seduta" value={teamSRPE.toLocaleString("it-IT")} hint="sRPE · squadra" icon="load" />
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
                <th className="px-3 py-2.5 font-semibold" title="Monotonia (Foster): media/DS del carico giornaliero. &gt;2 = poca variabilità">Monotonia</th>
                <th className="px-3 py-2.5 font-semibold" title="Strain (Foster): carico settimanale × monotonia">Strain</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, thisWeek, prevWeek, sessions, delta, monotony, strain }) => (
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
                  <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: monotony >= 2 ? "var(--warn)" : "var(--muted)" }}>{monotony || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{strain || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-[11px] text-muted-2">
          Carico interno = <b>sRPE</b> (durata × RPE). <b>Monotonia</b> (Foster) = media/DS del carico giornaliero: &gt;2 = poca variabilità, più rischio. <b>Strain</b> = carico settimanale × monotonia. Variazioni &gt;15% meritano attenzione.
        </p>
      </Panel>

      {/* Trend carico interno squadra */}
      <Panel title="Andamento carico interno squadra · sRPE" className="mb-6">
        <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
          {trend.map((t) => (
            <div key={t.date} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center">
                <div className="brand-bg w-2/3 rounded-t" style={{ height: `${(t.internal / maxInt) * 100}%` }} title={`sRPE ${t.internal} AU`} />
              </div>
              <span className={`text-[10px] ${t.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{t.isMatch ? "GARA" : `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}`}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
