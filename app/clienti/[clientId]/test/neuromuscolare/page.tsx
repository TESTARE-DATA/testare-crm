import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { TestClient } from "@/components/test/TestClient";

export default async function NeuromuscolarePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <TestClient clientId={clientId} athletes={getAthletes(clientId)} clientLogo={client.logo} clientName={client.name} />;
}
