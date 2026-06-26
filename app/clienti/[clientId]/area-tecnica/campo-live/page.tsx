import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { CampoLive } from "@/components/tecnica/CampoLive";

export default async function CampoLivePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <CampoLive clientId={clientId} />;
}
