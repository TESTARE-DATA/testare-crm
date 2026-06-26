import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getMedical } from "@/lib/data";
import { StoricoClient } from "@/components/medica/StoricoClient";

export default async function StoricoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <StoricoClient clientId={clientId} seedAthletes={getAthletes(clientId)} seedMedical={getMedical(clientId)} />;
}
