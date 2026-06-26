import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getEvents, getExercises, getExerciseHistory, getGps, getTemplates, getTests } from "@/lib/data";
import { getReadinessMap } from "@/lib/readiness";
import { ProgrammazioneClient } from "@/components/programmazione/ProgrammazioneClient";

export default async function ProgrammazionePage({ params }: { params: Promise<{ clientId: string }> }) {
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
  // serie storica carico/volume reale per atleta (da GPS)
  const gps = getGps(clientId).map((g) => ({ athleteId: g.athleteId, date: g.date, sRPE: g.sRPE, durationMin: g.durationMin }));
  const history = getExerciseHistory(clientId).map((h) => ({ athleteId: h.athleteId, exerciseId: h.exerciseId, exName: h.exName, date: h.date, kg: h.kg, sets: h.sets, reps: h.reps }));

  const readiness = getReadinessMap(clientId);
  // data del test più recente per atleta (riferimento del P-Index)
  const testDates: Record<string, string> = {};
  for (const t of getTests(clientId)) if (!testDates[t.athleteId] || t.date > testDates[t.athleteId]) testDates[t.athleteId] = t.date;

  // date partite (seed) per la codifica MD del piano — "tutto si parla" col calendario
  const seedMatchDates = getEvents(clientId).filter((e) => e.sessionType === "partita").map((e) => e.date);

  return <ProgrammazioneClient clientId={clientId} athletes={getAthletes(clientId)} exercises={exercises} templates={templates} gps={gps} history={history} readiness={readiness} testDates={testDates} seedMatchDates={seedMatchDates} />;
}
