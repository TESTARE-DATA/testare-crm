import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { medicalStaff } from "@/lib/medical";
import { getMeasurements } from "@/lib/measurements";
import { MisurazioniClient } from "@/components/test/MisurazioniClient";

export default async function MisurazioniPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  const staff = medicalStaff(client.staff);
  const recorder = staff.find((s) => /prepar|performance/i.test(s.role))?.name ?? staff[0]?.name;
  return <MisurazioniClient clientId={clientId} seedAthletes={getAthletes(clientId)} seedMeasurements={getMeasurements(clientId, recorder)} staff={staff} />;
}
