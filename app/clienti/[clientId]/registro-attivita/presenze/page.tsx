import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getEvents, getSeedAttendance } from "@/lib/data";
import { RegistroClient } from "@/components/registro/RegistroClient";

export default async function PresenzeAtletiPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  return (
    <RegistroClient
      clientId={clientId}
      athletes={getAthletes(clientId)}
      seedEvents={getEvents(clientId)}
      seedAttendance={getSeedAttendance(clientId)}
      view="presenze"
    />
  );
}
