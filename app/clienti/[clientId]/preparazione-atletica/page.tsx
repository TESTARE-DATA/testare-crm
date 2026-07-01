import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getExercises, getTemplates } from "@/lib/data";
import { getMergedGps } from "@/lib/server-gps";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function AreaPerformancePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const ex = getExercises(clientId).filter((e) => e.domain === "atletico");
  const tpl = getTemplates(clientId).filter((t) => t.domain === "palestra");

  // Stat Data Analysis (dal GPS reale + import)
  const gps = await getMergedGps(clientId);
  const sessions = new Set(gps.map((g) => g.date)).size;
  const lastDate = [...gps.map((g) => g.date)].sort().pop();
  const todays = lastDate ? gps.filter((g) => g.date === lastDate) : [];
  const lastKm = Math.round(todays.reduce((s, g) => s + g.totalDistanceM, 0) / 1000);
  const lastTrimp = todays.reduce((s, g) => s + g.trimp, 0);

  const palestra = [
    { slug: "preparazione-atletica/esercizi", icon: "dumbbell", title: "Esercizi", desc: "Forza, potenza, sprint, pliometria, prevenzione e mobilità.", stat: `${ex.length} esercizi` },
    { slug: "preparazione-atletica/template", icon: "layers", title: "Template", desc: "Sedute di palestra per gruppi muscolari, con carico interno stimato vs effettivo.", stat: `${tpl.length} template` },
  ];
  const dataAnalysis = [
    { slug: "carico", icon: "load", title: "Carico", desc: "Carico interno: sRPE e RPE degli allenamenti, carico settimanale per atleta e squadra, con trend e variazioni.", stat: `${sessions} sedute` },
    { slug: "cardiofrequenzimetro", icon: "pulse", title: "Cardiofrequenzimetro", desc: "Frequenza cardiaca, TRIMP (Edwards) e tempo nelle zone HR (Z4/Z5). Carico cardiovascolare interno per atleta.", stat: `${lastTrimp.toLocaleString("it-IT")} TRIMP ultima seduta` },
    { slug: "gps", icon: "live", title: "GPS", desc: "Carico esterno: distanza, alta velocità, sprint, accel/decel e Player Load dai tracker. Leaderboard e medie per ruolo.", stat: `${lastKm} km ultima seduta` },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Area Performance" subtitle="Palestra e analisi dei dati: forza e potenza, carico interno, cuore e GPS" icon="dumbbell" />

      <SubHeader icon="dumbbell" title="Palestra" hint="Programmazione della forza e della potenza" />
      <div className="grid gap-4 md:grid-cols-2">
        {palestra.map((c) => <AreaCard key={c.slug} clientId={clientId} card={c} />)}
      </div>

      <SubHeader icon="chart" title="Data Analysis" hint="Tutti i parametri raccolti sull'atleta: carico, cuore e GPS" />
      <div className="grid gap-4 md:grid-cols-3">
        {dataAnalysis.map((c) => <AreaCard key={c.slug} clientId={clientId} card={c} />)}
      </div>

      <div className="brand-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        <Icon name="sparkle" size={18} className="brand-text" />
        Il carico stimato dei template di palestra si confronta con il <Link href={sectionHref(clientId, "carico")} className="brand-text mx-1 font-semibold hover:underline">Carico</Link> reale; carico, cuore e GPS alimentano la <Link href={sectionHref(clientId, "rd")} className="brand-text mx-1 font-semibold hover:underline">Data Intelligence (R&D)</Link>.
      </div>
    </div>
  );
}

function SubHeader({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-2.5 first:mt-2">
      <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg"><Icon name={icon} size={16} /></span>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
        <p className="text-[12px] text-muted-2">{hint}</p>
      </div>
    </div>
  );
}

function AreaCard({ clientId, card }: { clientId: string; card: { slug: string; icon: string; title: string; desc: string; stat: string } }) {
  return (
    <Link href={sectionHref(clientId, card.slug)} className="card card-hover group flex h-full flex-col p-5">
      <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name={card.icon} size={24} /></span>
      <h3 className="mt-3 text-lg font-bold">{card.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{card.desc}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="brand-text text-sm font-semibold">{card.stat}</span>
        <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
