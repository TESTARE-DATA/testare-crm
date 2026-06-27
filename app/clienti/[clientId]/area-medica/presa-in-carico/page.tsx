import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getMedical } from "@/lib/data";
import { getResolvedAthletes } from "@/lib/server-roster";
import { readCollection } from "@/lib/db/collections";
import { medicalStaff, getSeedIntakes } from "@/lib/medical";
import type { MedicalClosure, MedicalIntake, MedicalRecord } from "@/lib/types";
import { PresaInCaricoClient } from "@/components/medica/PresaInCaricoClient";

export const dynamic = "force-dynamic";

export default async function PresaInCaricoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  const staff = medicalStaff(client.staff);
  const physio = staff.find((s) => s.role.toLowerCase().includes("fisio")) ?? staff[0];
  // Collezioni DB risolte lato server → la coda è già corretta al primo render.
  const [resolvedAthletes, initialMedical, initialIntakes, initialClosures] = await Promise.all([
    getResolvedAthletes(clientId),
    readCollection<MedicalRecord>(`medical:${clientId}`).catch(() => [] as MedicalRecord[]),
    readCollection<MedicalIntake>(`intake:${clientId}`).catch(() => [] as MedicalIntake[]),
    readCollection<MedicalClosure>(`medical-closed:${clientId}`).catch(() => [] as MedicalClosure[]),
  ]);
  return (
    <PresaInCaricoClient
      clientId={clientId}
      seedAthletes={resolvedAthletes}
      seedMedical={getMedical(clientId)}
      seedIntakes={getSeedIntakes(clientId, physio?.name, physio?.role)}
      initialMedical={initialMedical}
      initialIntakes={initialIntakes}
      initialClosures={initialClosures}
      staff={staff}
    />
  );
}
