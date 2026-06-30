import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getImports } from "@/lib/data";
import { getResolvedAthletes } from "@/lib/server-roster";
import { PageHeader } from "@/components/ui";
import { ImportaClient } from "@/components/importa/ImportaClient";

export default async function ImportaDatiPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const jobs = getImports(clientId);
  // Rosa effettiva (seed + atleti aggiunti/override) per l'abbinamento in import.
  const resolved = await getResolvedAthletes(clientId).catch(() => getAthletes(clientId));
  const roster = resolved.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, shirtNumber: a.shirtNumber, role: a.role }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Importa Dati"
        subtitle="Carica i tuoi dati in 4 passi — finiscono automaticamente nelle sezioni giuste"
        icon="upload"
      />
      <ImportaClient clientId={clientId} seedJobs={jobs} roster={roster} />
    </div>
  );
}
