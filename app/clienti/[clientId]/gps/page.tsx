import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getMergedGps } from "@/lib/server-gps";
import { sectionHref } from "@/lib/nav";
import type { Athlete, GpsRecord, PlayerRole } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PageHeader, Panel } from "@/components/ui";
import { DailyView } from "@/components/data-analysis/DailyView";

const ROLES: PlayerRole[] = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

export default async function GpsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = await getMergedGps(clientId);
  const lite = athletes.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, role: a.role, shirtNumber: a.shirtNumber }));

  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const lastDate = dates[dates.length - 1];
  const todays = gps.filter((g) => g.date === lastDate);

  const perAthlete = athletes
    .map((a) => ({ a, last: gps.filter((g) => g.athleteId === a.id).sort((m, n) => m.date.localeCompare(n.date)).pop() }))
    .filter((r): r is { a: Athlete; last: GpsRecord } => !!r.last);

  const top = (sel: (g: GpsRecord) => number) => [...perAthlete].sort((x, y) => sel(y.last) - sel(x.last))[0];
  const topDist = top((g) => g.totalDistanceM);
  const topHsr = top((g) => g.highSpeedM);
  const topSpeed = top((g) => g.maxSpeedKmh);
  const topSprint = top((g) => g.sprintCount);

  const byRole = ROLES.map((role) => {
    const recs = todays.filter((g) => athletes.find((a) => a.id === g.athleteId)?.role === role);
    const avg = recs.length ? Math.round(recs.reduce((s, g) => s + g.totalDistanceM, 0) / recs.length) : 0;
    return { role, avg };
  });
  const maxRoleAvg = Math.max(1, ...byRole.map((r) => r.avg));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="GPS" subtitle="Vista giornaliera del carico esterno: distanza, alta velocità, sprint e Player Load per squadra, reparto e singolo, con baseline 7/28g e flag" icon="live"
        actions={<Link href={sectionHref(clientId, "importa-dati")} className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold hover:bg-background"><Icon name="upload" size={16} /> Importa GPS</Link>} />

      {/* Leaderboard ultima seduta */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Leader icon="live" label="Più distanza" name={topDist?.a.lastName} value={topDist ? `${(topDist.last.totalDistanceM / 1000).toFixed(1)} km` : "—"} clientId={clientId} id={topDist?.a.id} />
        <Leader icon="trend" label="Più alta velocità" name={topHsr?.a.lastName} value={topHsr ? `${topHsr.last.highSpeedM} m` : "—"} clientId={clientId} id={topHsr?.a.id} />
        <Leader icon="stopwatch" label="Top speed" name={topSpeed?.a.lastName} value={topSpeed ? `${topSpeed.last.maxSpeedKmh} km/h` : "—"} clientId={clientId} id={topSpeed?.a.id} />
        <Leader icon="load" label="Più sprint" name={topSprint?.a.lastName} value={topSprint ? `${topSprint.last.sprintCount}` : "—"} clientId={clientId} id={topSprint?.a.id} />
      </div>

      {/* VISTA GIORNALIERA — schema condiviso della Data Analysis */}
      <DailyView clientId={clientId} area="gps" athletes={lite} records={gps} />

      {/* Distanza media per ruolo · ultima seduta (complementare) */}
      <Panel title="Distanza media per ruolo · ultima seduta" className="mb-6">
        <div className="grid gap-3.5 p-5 sm:grid-cols-2">
          {byRole.map((r) => (
            <div key={r.role}>
              <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium">{r.role}</span><span className="font-mono text-muted">{(r.avg / 1000).toFixed(1)} km</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-background"><div className="brand-bg h-full rounded-full" style={{ width: `${(r.avg / maxRoleAvg) * 100}%` }} /></div>
            </div>
          ))}
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
