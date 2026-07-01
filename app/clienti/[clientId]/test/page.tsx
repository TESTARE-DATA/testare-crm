import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { readCollection } from "@/lib/db/collections";
import type { AthleteTestSession } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function TestHub({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const sessions = await readCollection<AthleteTestSession>(`athlete-tests:${clientId}`).catch(() => [] as AthleteTestSession[]);
  const pAvg = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.pIndex, 0) / athletes.length) : 0;

  const areas = [
    {
      slug: "test/performance",
      icon: "bolt",
      title: "Area Performance",
      desc: "I nostri test neuromuscolari: statistiche di squadra, ranking, evoluzione e archivio dei report. Batteria TESTÀRE evidence-based (forza, potenza, reattività, simmetrie).",
      tags: ["Forza", "Potenza", "Reattività", "Simmetrie"],
      stat: `${pAvg}° P-Index medio · ${sessions.length} sessioni`,
      primary: true,
      testare: true,
    },
    {
      slug: "test/area-medica",
      icon: "medical",
      title: "Area Medica",
      desc: "Report e referti dell'area medica: screening, disponibilità della rosa e sintesi cliniche. Archivio dei file inviati da TESTÀRE.",
      tags: ["Referti", "Screening", "Disponibilità"],
      stat: "Archivio report",
      testare: true,
    },
    {
      slug: "test/direzione-sportiva",
      icon: "building",
      title: "Direzione Sportiva",
      desc: "Report per la direzione sportiva: sintesi rosa, monitoraggio e reportistica gestionale. Archivio dei file inviati da TESTÀRE.",
      tags: ["Rosa", "Monitoraggio", "Sintesi"],
      stat: "Archivio report",
      testare: true,
    },
    {
      slug: "test/misurazioni",
      icon: "clipboard",
      title: "Misure Interne",
      desc: "Misure e test rapidi rilevati dallo staff durante l'anno — peso, plicometria, sprint, salti, mobilità — da annotare e monitorare atleta per atleta.",
      tags: ["Antropometria", "Velocità", "Potenza", "Mobilità"],
      stat: "Rilevazioni libere",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl fade-up">
      <PageHeader title="Test e misura" subtitle="Performance, area medica, direzione sportiva e misure interne della società" icon="stopwatch" />

      <div className="grid gap-5 md:grid-cols-2">
        {areas.map((a) => (
          <Link
            key={a.slug}
            href={sectionHref(clientId, a.slug)}
            className={`card card-hover sheen group relative flex flex-col overflow-hidden p-6 ${a.primary ? "md:col-span-2" : ""}`}
          >
            {a.primary && <div className="grad-line absolute inset-x-0 top-0" />}
            <div className="flex items-center justify-between">
              <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name={a.icon} size={24} /></span>
              {a.testare
                ? <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={150} height={38} className="h-[18px] w-auto" />
                : <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted">Interno · società</span>}
            </div>
            <h3 className="mt-4 text-xl font-bold">{a.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{a.desc}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.tags.map((t) => (
                <span key={t} className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted">{t}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="brand-text text-sm font-semibold">{a.stat}</span>
              <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="brand-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        <Icon name="link" size={18} className="brand-text" />
        Ogni area raccoglie i test e i report del proprio reparto; l&apos;<b className="mx-1">Area Performance</b> ospita la valutazione neuromuscolare certificata TESTÀRE con le statistiche di squadra.
      </div>
    </div>
  );
}
