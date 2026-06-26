import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getExercises, getTemplates } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function AreaTecnicaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const ex = getExercises(clientId).filter((e) => e.domain === "tattico");
  const tpl = getTemplates(clientId).filter((t) => t.domain === "campo");

  const cards = [
    { slug: "area-tecnica/campo-live", icon: "live", title: "Campo Live", desc: "Disegna l'esercitazione su un campo interattivo e salvala in libreria.", stat: "Editor" },
    { slug: "area-tecnica/esercitazioni", icon: "pitch", title: "Esercitazioni", desc: "Libreria degli esercizi tattici di campo.", stat: `${ex.length} esercizi` },
    { slug: "area-tecnica/template", icon: "layers", title: "Template", desc: "Sedute di campo con carico interno ed esterno stimato vs effettivo.", stat: `${tpl.length} template` },
  ];

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader title="Area Tecnica" subtitle="Lavoro di campo: Campo Live, esercitazioni e template tattici" icon="pitch" />
      <div className="grid gap-4 md:grid-cols-3">
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
        Flusso: crei l&apos;esercizio in <b className="mx-1">Campo Live</b> → entra nelle <b className="mx-1">Esercitazioni</b> → lo componi in un <b className="mx-1">Template</b> → lo assegni nel <Link href={sectionHref(clientId, "calendario")} className="brand-text mx-1 font-semibold hover:underline">Calendario</Link>.
      </div>
    </div>
  );
}
