import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getRehabItems } from "@/lib/medical";
import { EserciziTrattamentiClient } from "@/components/medica/EserciziTrattamentiClient";

export default async function EserciziTrattamentiPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <EserciziTrattamentiClient clientId={clientId} seedItems={getRehabItems(clientId)} seedCount={getAthletes(clientId).length} />;
}
