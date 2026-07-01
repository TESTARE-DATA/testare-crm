import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { readCollection } from "@/lib/db/collections";
import type { AthleteTestSession } from "@/lib/types";
import { TestClient } from "@/components/test/TestClient";

export default async function PerformancePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  // Le sessioni reali importate (report neuromuscolari) alimentano il dashboard.
  const sessions = await readCollection<AthleteTestSession>(`athlete-tests:${clientId}`).catch(() => [] as AthleteTestSession[]);
  return <TestClient clientId={clientId} athletes={getAthletes(clientId)} clientLogo={client.logo} clientName={client.name} initialSessions={sessions} />;
}
