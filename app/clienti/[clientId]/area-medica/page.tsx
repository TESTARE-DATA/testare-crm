import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getMedical } from "@/lib/data";
import { getRehabItems, getRehabTemplates } from "@/lib/medical";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { MedHeader } from "@/components/medica/MedHeader";

export default async function AreaMedicaHub({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const active = getMedical(clientId).filter((m) => m.phase !== "conclusa");
  const inCura = new Set([
    ...active.map((m) => m.athleteId),
    ...athletes.filter((a) => a.status === "infortunato" || a.status === "in recupero").map((a) => a.id),
  ]).size;
  const items = getRehabItems(clientId);
  const templates = getRehabTemplates(clientId);

  const cards = [
    { slug: "area-medica/overview", icon: "users", title: "Overview", desc: "Tutta la rosa con stato clinico, bordi colorati e readiness.", stat: `${inCura} in cura` },
    { slug: "area-medica/presa-in-carico", icon: "clipboard", title: "Presa in carico", desc: "Anamnesi, diagnosi, prognosi, prescrizione e affidamento allo staff.", stat: `${active.length} casi` },
    { slug: "area-medica/diario", icon: "pulse", title: "Diario fisioterapico", desc: "Registro delle sedute di fisioterapia e riabilitazione, con autore e area.", stat: "Sedute" },
    { slug: "area-medica/esercizi-trattamenti", icon: "dumbbell", title: "Esercizi e trattamenti", desc: "Libreria riabilitativa evidence-based con dosaggio e intensità.", stat: `${items.length} voci` },
    { slug: "area-medica/template", icon: "layers", title: "Template", desc: "Protocolli per fase con durata, frequenza, volume e criteri di uscita.", stat: `${templates.length} protocolli` },
  ];

  return (
    <div className="mx-auto max-w-[1200px] fade-up">
      <MedHeader section="Centro clinico" title="Area Medica" subtitle="Gestione clinica e riabilitativa della rosa: dalla presa in carico al rientro" icon="medical" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.slug} href={sectionHref(clientId, c.slug)} className="card card-hover med-topline group flex flex-col p-5">
            <span className="med-soft-bg med-accent flex h-12 w-12 items-center justify-center rounded-xl"><Icon name={c.icon} size={24} /></span>
            <h3 className="mt-3 text-lg font-bold">{c.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{c.desc}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="med-accent text-sm font-semibold">{c.stat}</span>
              <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="med-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        <Icon name="link" size={18} className="med-accent" />
        Flusso: l&apos;atleta arriva dalla <Link href={sectionHref(clientId, "rosa")} className="med-accent mx-1 font-semibold hover:underline">Rosa</Link> → <b className="mx-1">Presa in carico</b> (anamnesi/diagnosi/prognosi) → <b className="mx-1">Diario</b> e <b className="mx-1">Protocolli</b> di riabilitazione → rientro.
      </div>
    </div>
  );
}
