import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getTests } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

export default async function TestHub({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const tests = getTests(clientId);

  return (
    <div className="mx-auto max-w-5xl fade-up">
      <PageHeader title="Test e misurazioni" subtitle="Valutazione neuromuscolare TESTÀRE e misurazioni rilevate internamente" icon="stopwatch" />

      <div className="grid gap-5 md:grid-cols-2">
        {/* Valutazione neuromuscolare TESTÀRE */}
        <Link href={sectionHref(clientId, "test/neuromuscolare")} className="card card-hover sheen group relative flex flex-col overflow-hidden p-6">
          <div className="grad-line absolute inset-x-0 top-0" />
          <div className="flex items-center justify-between">
            <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name="stopwatch" size={24} /></span>
            <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={150} height={38} className="h-[18px] w-auto" />
          </div>
          <h3 className="mt-4 text-xl font-bold">Valutazione neuromuscolare</h3>
          <p className="mt-1 flex-1 text-sm text-muted">
            La batteria di test TESTÀRE evidence-based (forza, potenza, reattività, simmetrie) con ranking,
            distribuzione, evoluzione e archivio dei report. Percentili 0–100° e P-Index.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["Forza", "Potenza", "Reattività", "Simmetrie"].map((t) => (
              <span key={t} className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted">{t}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="brand-text text-sm font-semibold">{tests.length} risultati · {athletes.length} atleti</span>
            <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Misurazioni interne */}
        <Link href={sectionHref(clientId, "test/misurazioni")} className="card card-hover sheen group relative flex flex-col overflow-hidden p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-foreground/70"><Icon name="clipboard" size={24} /></span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted">Interno · società</span>
          </div>
          <h3 className="mt-4 text-xl font-bold">Misurazioni interne</h3>
          <p className="mt-1 flex-1 text-sm text-muted">
            Misure e test rapidi rilevati dallo staff durante l'anno — peso, plicometria, sprint, salti,
            mobilità — da annotare e monitorare nel tempo, atleta per atleta.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["Antropometria", "Velocità", "Potenza", "Mobilità"].map((t) => (
              <span key={t} className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted">{t}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground/70">Rilevazioni libere</span>
            <Icon name="chevron" size={18} className="text-muted-2 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      <div className="brand-soft-bg mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
        <Icon name="link" size={18} className="brand-text" />
        La <b className="mx-1">valutazione neuromuscolare</b> è la batteria certificata TESTÀRE; le <b className="mx-1">misurazioni interne</b> sono i rilievi rapidi che fate voi durante la stagione.
      </div>
    </div>
  );
}
