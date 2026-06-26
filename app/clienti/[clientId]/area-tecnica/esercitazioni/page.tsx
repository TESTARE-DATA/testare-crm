import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getExercises } from "@/lib/data";
import { EserciziClient } from "@/components/tecnica/EserciziClient";

export default async function EsercitazioniPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <EserciziClient clientId={clientId} seed={getExercises(clientId)} domain="tattico" athletes={getAthletes(clientId)} />;
}
