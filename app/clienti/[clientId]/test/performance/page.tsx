import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getResolvedAthletes } from "@/lib/server-roster";
import { readCollection } from "@/lib/db/collections";
import type { Athlete, AthleteTestSession } from "@/lib/types";
import { TestClient } from "@/components/test/TestClient";

export default async function PerformancePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  // Rosa COMPLETA (seed risolto + atleti creati/importati) così ogni atleta con
  // una valutazione compare in ranking/statistiche; + le sessioni reali importate.
  const [seedResolved, created, sessions] = await Promise.all([
    getResolvedAthletes(clientId),
    readCollection<Athlete>(`athletes:${clientId}`).catch(() => [] as Athlete[]),
    readCollection<AthleteTestSession>(`athlete-tests:${clientId}`).catch(() => [] as AthleteTestSession[]),
  ]);
  const roster = [...seedResolved, ...created];
  return <TestClient clientId={clientId} athletes={roster} clientLogo={client.logo} clientName={client.name} initialSessions={sessions} />;
}
