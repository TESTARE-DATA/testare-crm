import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { sectionHref } from "@/lib/nav";
import { BackLink, PageHeader } from "@/components/ui";
import { ReportArchive, type ReportFile } from "@/components/test/ReportArchive";

const DEMO: ReportFile[] = [
  { id: "am-seed-1", name: "Report clinico di sintesi", date: "2026-05-13", kind: "html", url: "/reports/esempio-area-medica.html", demo: true },
  { id: "am-seed-1b", name: "Report clinico di sintesi", date: "2026-05-13", kind: "pdf", url: "/reports/esempio-valutazione.pdf", demo: true },
];

export default async function TestAreaMedicaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <BackLink href={sectionHref(clientId, "test")}>Test e misura</BackLink>
      <PageHeader title="Area Medica" subtitle="Report e referti dell'area medica inviati da TESTÀRE — archivio file" icon="medical" />
      <ReportArchive
        collection={`test-reports-medica:${clientId}`}
        clientLogo={client.logo}
        clientName={client.name}
        title="dell'Area Medica"
        hint="Referti clinici, screening e report di disponibilità della rosa (HTML interattivo + PDF), in ordine di data."
        seed={DEMO}
        defaultName="Report clinico"
      />
    </div>
  );
}
