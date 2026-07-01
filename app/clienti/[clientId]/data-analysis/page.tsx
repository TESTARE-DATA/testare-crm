import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getMergedGps } from "@/lib/server-gps";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function DataAnalysisPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const gps = await getMergedGps(clientId);
  const athletes = getAthletes(clientId);
  const sessions = new Set(gps.map((g) => g.date)).size;
  const lastDate = [...gps.map((g) => g.date)].sort().pop();
  const todays = lastDate ? gps.filter((g) => g.date === lastDate) : [];
  const lastKm = Math.round(todays.reduce((s, g) => s + g.totalDistanceM, 0) / 1000);
  const lastTrimp = todays.reduce((s, g) => s + g.trimp, 0);

  const cards = [
    {
      slug: "carico",
      icon: "load",
      title: "Carico",
      desc: "Carico interno: sRPE e RPE degli allenamenti, carico settimanale per atleta e squadra, con trend e variazioni.",
      stat: `${sessions} sedute`,
    },
    {
      slug: "cardiofrequenzimetro",
      icon: "pulse",
      title: "Cardiofrequenzimetro",
      desc: "Frequenza cardiaca, TRIMP (Edwards) e tempo nelle zone HR (Z4/Z5). Carico cardiovascolare interno per atleta.",
      stat: `${lastTrimp.toLocaleString("it-IT")} TRIMP ultima seduta`,
    },
    {
      slug: "gps",
      icon: "live",
      title: "GPS",
      desc: "Carico esterno: distanza, alta velocità, sprint, accel/decel e Player Load dai tracker. Leaderboard e medie per ruolo.",
      stat: `${lastKm} km ultima seduta`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Data Analysis" subtitle="Tutti i parametri raccolti sull'atleta: carico, cuore, GPS e test" icon="chart" />
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
        I dati di carico, cuore, GPS e test alimentano la <Link href={sectionHref(clientId, "rd")} className="brand-text mx-1 font-semibold hover:underline">Data Intelligence (R&D)</Link> per costruire correlazioni e report su {athletes.length} atleti.
      </div>
    </div>
  );
}
