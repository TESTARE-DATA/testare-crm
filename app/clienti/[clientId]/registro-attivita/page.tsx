import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getEvents } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

const REF_TODAY = "2026-06-19"; // riferimento "oggi" coerente col calendario

export default async function RegistroAttivitaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const done = getEvents(clientId).filter((e) => e.sessionType !== "riposo" && e.date <= REF_TODAY);

  const cards = [
    {
      slug: "registro-attivita/presenze",
      icon: "users",
      title: "Presenze atleti",
      desc: "Presenza per atleta, carico assorbito e statistiche per tipo di seduta. Collegato a calendario e area medica.",
      stat: `${athletes.length} atleti`,
    },
    {
      slug: "registro-attivita/allenamenti-svolti",
      icon: "clipboard",
      title: "Allenamenti svolti",
      desc: "Storico cronologico delle sedute svolte, per tipo e obiettivo. Da qui registri le presenze di ogni seduta.",
      stat: `${done.length} sedute svolte`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Registro Attività" subtitle="Presenze degli atleti e storico degli allenamenti svolti" icon="clipboard" />
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
    </div>
  );
}
