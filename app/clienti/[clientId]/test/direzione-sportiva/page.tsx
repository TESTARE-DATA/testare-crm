import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { sectionHref } from "@/lib/nav";
import { BackLink, PageHeader } from "@/components/ui";
import { ReportArchive, type ReportFile } from "@/components/test/ReportArchive";

const DEMO: ReportFile[] = [
  { id: "ds-seed-1", name: "Report direzione sportiva", date: "2026-05-13", kind: "html", url: "/reports/esempio-direzione-sportiva.html", demo: true },
  { id: "ds-seed-1b", name: "Report direzione sportiva", date: "2026-05-13", kind: "pdf", url: "/reports/esempio-valutazione.pdf", demo: true },
];

export default async function TestDirezioneSportivaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <BackLink href={sectionHref(clientId, "test")}>Test e misura</BackLink>
      <PageHeader title="Direzione Sportiva" subtitle="Report per la direzione sportiva inviati da TESTÀRE — archivio file" icon="building" />
      <ReportArchive
        collection={`test-reports-ds:${clientId}`}
        clientLogo={client.logo}
        clientName={client.name}
        title="della Direzione Sportiva"
        hint="Sintesi rosa, monitoraggio e report gestionali per la direzione sportiva (HTML interattivo + PDF), in ordine di data."
        seed={DEMO}
        defaultName="Report direzione sportiva"
      />
    </div>
  );
}
