import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getExercises, getTemplates } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function PrepAtleticaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const ex = getExercises(clientId).filter((e) => e.domain === "atletico");
  const tpl = getTemplates(clientId).filter((t) => t.domain === "palestra");

  const cards = [
    { slug: "preparazione-atletica/esercizi", icon: "dumbbell", title: "Esercizi", desc: "Forza, potenza, sprint, pliometria, prevenzione e mobilità.", stat: `${ex.length} esercizi` },
    { slug: "preparazione-atletica/template", icon: "layers", title: "Template", desc: "Sedute di palestra per gruppi muscolari, con carico interno stimato vs effettivo.", stat: `${tpl.length} template` },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Preparazione Atletica" subtitle="Lavoro di palestra: esercizi e template di forza, potenza e prevenzione" icon="dumbbell" />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.slug} href={sectionHref(clientId, c.slug)} className="card card-hover group flex flex-col p-5">
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
        <Icon name="link" size={18} className="brand-text" />
        Il carico stimato dei template di palestra si confronta con il <Link href={sectionHref(clientId, "carico")} className="brand-text mx-1 font-semibold hover:underline">Carico</Link> reale e guida i gruppi di lavoro definiti dal profilo performance di ogni atleta.
      </div>
    </div>
  );
}
