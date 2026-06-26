import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getMedical } from "@/lib/data";
import { getReadinessMap } from "@/lib/readiness";
import { AreaMedicaClient } from "@/components/medica/AreaMedicaClient";

export default async function AreaMedicaOverview({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return (
    <AreaMedicaClient
      clientId={clientId}
      seed={getMedical(clientId)}
      athletes={getAthletes(clientId)}
      readiness={getReadinessMap(clientId)}
    />
  );
}
