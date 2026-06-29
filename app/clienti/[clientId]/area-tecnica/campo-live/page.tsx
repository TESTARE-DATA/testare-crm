import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { CampoLive } from "@/components/tecnica/CampoLive";

export default async function CampoLivePage({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { clientId } = await params;
  const { edit } = await searchParams;
  const client = getClient(clientId);
  if (!client) notFound();
  return <CampoLive clientId={clientId} editId={edit} />;
}
