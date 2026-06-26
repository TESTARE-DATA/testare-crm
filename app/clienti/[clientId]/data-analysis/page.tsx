import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function DataAnalysisPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const gps = getGps(clientId);
  const athletes = getAthletes(clientId);
  const sessions = new Set(gps.map((g) => g.date)).size;
  const lastDate = [...gps.map((g) => g.date)].sort().pop();
  const lastKm = lastDate
    ? Math.round(gps.filter((g) => g.date === lastDate).reduce((s, g) => s + g.totalDistanceM, 0) / 1000)
    : 0;

  const cards = [
    {
      slug: "carico",
      icon: "load",
      title: "Carico",
      desc: "Carico interno (sRPE, TRIMP, zone HR) ed esterno per atleta e per squadra, con trend e monotonia.",
      stat: `${sessions} sedute`,
    },
    {
      slug: "gps",
      icon: "live",
      title: "GPS",
      desc: "Distanza, alta velocità, sprint, accel/decel e Player Load dai tracker. Leaderboard e medie per ruolo.",
      stat: `${lastKm} km ultima seduta`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Data Analysis" subtitle="Monitoraggio del carico e dei dati di tracking GPS" icon="chart" />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.slug} href={sectionHref(clientId, c.slug)} className="card card-hover sheen group flex flex-col p-5">
            <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name={c.icon} size={24} /></span>
            <h3 className="mt-3 text-lg font-bold">{c.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{c.desc}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="brand-text text-sm font-semibold">{c.stat}</span>
              <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
      <div className="brand-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        <Icon name="sparkle" size={18} className="brand-text" />
        I dati di Carico e GPS alimentano la <Link href={sectionHref(clientId, "rd")} className="brand-text mx-1 font-semibold hover:underline">Data Intelligence (R&D)</Link> per costruire correlazioni e report su {athletes.length} atleti.
      </div>
    </div>
  );
}
