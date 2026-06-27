import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getMedical } from "@/lib/data";
import { getResolvedAthletes } from "@/lib/server-roster";
import { getReadinessMap } from "@/lib/readiness";
import { AreaMedicaClient } from "@/components/medica/AreaMedicaClient";

// Legge gli stati atleta dal DB: niente caching statico, sempre dati freschi.
export const dynamic = "force-dynamic";

export default async function AreaMedicaOverview({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return (
    <AreaMedicaClient
      clientId={clientId}
      seed={getMedical(clientId)}
      athletes={await getResolvedAthletes(clientId)}
      readiness={getReadinessMap(clientId)}
    />
  );
}
