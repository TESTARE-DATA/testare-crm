import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getReadinessMap } from "@/lib/readiness";
import { RosaClient } from "@/components/rosa/RosaClient";

export default async function RosaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  return <RosaClient clientId={clientId} seed={getAthletes(clientId)} readiness={getReadinessMap(clientId)} />;
}
