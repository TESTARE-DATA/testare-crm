import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import type { GpsRecord, PlayerRole } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PageHeader, Panel, StatCard } from "@/components/ui";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

export default async function GpsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = getGps(clientId);
  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const lastDate = dates[dates.length - 1];
  const todays = gps.filter((g) => g.date === lastDate);

  const perAthlete = athletes
    .map((a) => {
      const recs = gps.filter((g) => g.athleteId === a.id).sort((m, n) => m.date.localeCompare(n.date));
      return { a, recs, last: recs[recs.length - 1] };
    })
    .filter((r) => r.last);

  // leaderboard
  const top = (sel: (g: GpsRecord) => number) => [...perAthlete].sort((x, y) => sel(y.last!) - sel(x.last!))[0];
  const topDist = top((g) => g.totalDistanceM);
  const topHsr = top((g) => g.highSpeedM);
  const topSpeed = top((g) => g.maxSpeedKmh);
  const topSprint = top((g) => g.sprintCount);

  // medie per ruolo (ultima seduta)
  const byRole = ROLES.map((role) => {
    const recs = todays.filter((g) => athletes.find((a) => a.id === g.athleteId)?.role === role);
    const avg = recs.length ? Math.round(recs.reduce((s, g) => s + g.totalDistanceM, 0) / recs.length) : 0;
    return { role, avg };
  });
  const maxRoleAvg = Math.max(1, ...byRole.map((r) => r.avg));

  const teamDist = todays.reduce((s, g) => s + g.totalDistanceM, 0);
  const teamHsr = todays.reduce((s, g) => s + g.highSpeedM, 0);
  const maxLastDist = Math.max(1, ...perAthlete.map((r) => r.last!.totalDistanceM));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="GPS" subtitle="Analisi del carico esterno da tracking GPS — squadra e singolo atleta" icon="live"
        actions={<Link href={sectionHref(clientId, "importa-dati")} className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold hover:bg-background"><Icon name="upload" size={16} /> Importa GPS</Link>} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Distanza squadra" value={`${(teamDist / 1000).toFixed(1)} km`} hint="ultima seduta" tone="brand" icon="live" />
        <StatCard label="Alta velocità" value={`${teamHsr} m`} hint=">19.8 km/h" icon="trend" />
        <StatCard label="Vel. max" value={`${Math.max(0, ...todays.map((g) => g.maxSpeedKmh))} km/h`} tone="good" icon="stopwatch" />
        <StatCard label="Atleti tracciati" value={perAthlete.length} icon="users" />
      </div>

      {/* Leaderboard */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Leader icon="live" label="Più distanza" name={topDist?.a.lastName} value={topDist ? `${(topDist.last!.totalDistanceM / 1000).toFixed(1)} km` : "—"} clientId={clientId} id={topDist?.a.id} />
        <Leader icon="trend" label="Più alta velocità" name={topHsr?.a.lastName} value={topHsr ? `${topHsr.last!.highSpeedM} m` : "—"} clientId={clientId} id={topHsr?.a.id} />
        <Leader icon="stopwatch" label="Top speed" name={topSpeed?.a.lastName} value={topSpeed ? `${topSpeed.last!.maxSpeedKmh} km/h` : "—"} clientId={clientId} id={topSpeed?.a.id} />
        <Leader icon="load" label="Più sprint" name={topSprint?.a.lastName} value={topSprint ? `${topSprint.last!.sprintCount}` : "—"} clientId={clientId} id={topSprint?.a.id} />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        {/* Distanza media per ruolo */}
        <Panel title="Distanza media per ruolo" className="lg:col-span-1">
          <div className="space-y-3.5 p-5">
            {byRole.map((r) => (
              <div key={r.role}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium">{r.role}</span><span className="font-mono text-muted">{(r.avg / 1000).toFixed(1)} km</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-background"><div className="brand-bg h-full rounded-full" style={{ width: `${(r.avg / maxRoleAvg) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Trend distanza squadra */}
        <Panel title="Distanza squadra · andamento" className="lg:col-span-2">
          <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
            {dates.map((d) => {
              const recs = gps.filter((g) => g.date === d);
              const tot = recs.reduce((s, g) => s + g.totalDistanceM, 0);
              const isMatch = recs.some((g) => g.durationMin > 90);
              const maxTot = Math.max(1, ...dates.map((dd) => gps.filter((g) => g.date === dd).reduce((s, g) => s + g.totalDistanceM, 0)));
              return (
                <div key={d} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-full items-end justify-center">
                    <div className="w-2/3 rounded-t" style={{ height: `${(tot / maxTot) * 100}%`, backgroundColor: isMatch ? "var(--bad)" : "var(--brand-primary)" }} title={`${(tot / 1000).toFixed(1)} km`} />
                  </div>
                  <span className={`text-[10px] ${isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{isMatch ? "GARA" : `${d.slice(8, 10)}/${d.slice(5, 7)}`}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Tabella per atleta con sparkline */}
      <Panel title="Dettaglio per atleta · ultima seduta">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Atleta</th>
                <th className="px-3 py-2.5 font-semibold">Distanza</th>
                <th className="px-3 py-2.5 font-semibold">Alta vel.</th>
                <th className="px-3 py-2.5 font-semibold">Sprint</th>
                <th className="px-3 py-2.5 font-semibold">Vel. max</th>
                <th className="px-3 py-2.5 font-semibold">Acc/Dec</th>
                <th className="px-3 py-2.5 font-semibold">P.Load</th>
                <th className="px-3 py-2.5 font-semibold">Trend distanza</th>
              </tr>
            </thead>
            <tbody>
              {perAthlete.sort((x, y) => y.last!.totalDistanceM - x.last!.totalDistanceM).map(({ a, recs, last: g }) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-2.5"><Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="font-medium hover:underline">{a.lastName}</Link></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-background"><div className="brand-bg h-full" style={{ width: `${(g!.totalDistanceM / maxLastDist) * 100}%` }} /></div>
                      <span className="font-mono font-semibold">{(g!.totalDistanceM / 1000).toFixed(1)}km</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.highSpeedM}m</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.sprintCount}</td>
                  <td className="px-3 py-2.5 font-mono">{g!.maxSpeedKmh}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{g!.accelerations}/{g!.decelerations}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{g!.playerLoad}</td>
                  <td className="px-3 py-2.5"><Sparkline values={recs.map((r) => r.totalDistanceM)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Leader({ icon, label, name, value, clientId, id }: { icon: string; label: string; name?: string; value: string; clientId: string; id?: string }) {
  const inner = (
    <div className="card card-hover flex items-center gap-3 p-4">
      <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl"><Icon name={icon} size={22} /></span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</div>
        <div className="truncate text-sm font-bold">{name ?? "—"}</div>
        <div className="brand-text font-mono text-[13px] font-bold">{value}</div>
      </div>
    </div>
  );
  return id ? <Link href={`${sectionHref(clientId, "rosa")}/${id}`}>{inner}</Link> : inner;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-muted-2">—</span>;
  const w = 90, h = 26, max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="var(--brand-primary)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((values[values.length - 1] - min) / range) * h} r={2.5} fill="var(--brand-primary)" />
    </svg>
  );
}
