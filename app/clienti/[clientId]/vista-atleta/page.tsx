import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getReadinessEngine } from "@/lib/readinessEngine";
import { VistaAtletaClient } from "@/components/atleta/VistaAtletaClient";

export default async function VistaAtletaPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  const states = getReadinessEngine(clientId);
  return <VistaAtletaClient clientName={client.name} clientLogo={client.logo} states={states} />;
}
