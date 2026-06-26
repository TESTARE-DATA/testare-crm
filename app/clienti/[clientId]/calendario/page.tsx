import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getEvents, getExercises, getTemplates, getSeedAttendance } from "@/lib/data";
import { CalendarClient } from "@/components/calendario/CalendarClient";

export default async function CalendarioPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const exAll = getExercises(clientId);
  const exMap = new Map(exAll.map((e) => [e.id, e]));
  const exercises = exAll.map((e) => ({ id: e.id, name: e.name, domain: e.domain, durationMin: e.durationMin, category: e.category as string }));
  const templates = getTemplates(clientId).map((t) => ({
    id: t.id, name: t.name, domain: t.domain, durationMin: t.estimated.durationMin, rpe: t.estimated.internalRpe,
    items: t.exerciseIds.map((id) => ({ exerciseId: id, name: exMap.get(id)?.name ?? id, durationMin: exMap.get(id)?.durationMin })),
  }));

  return (
    <CalendarClient
      clientId={clientId}
      seed={getEvents(clientId)}
      athletes={getAthletes(clientId)}
      templates={templates}
      exercises={exercises}
      seedAttendance={getSeedAttendance(clientId)}
    />
  );
}
