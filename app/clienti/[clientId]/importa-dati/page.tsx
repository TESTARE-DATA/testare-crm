import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getImports } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ImportaClient } from "@/components/importa/ImportaClient";

export default async function ImportaDatiPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const jobs = getImports(clientId);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Importa Dati"
        subtitle="Sorgenti esterne che alimentano automaticamente le sezioni dell'app"
        icon="upload"
      />
      <ImportaClient clientId={clientId} seedJobs={jobs} />
    </div>
  );
}
