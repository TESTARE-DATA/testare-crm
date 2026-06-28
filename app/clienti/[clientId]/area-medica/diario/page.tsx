import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getMedical } from "@/lib/data";
import { getResolvedAthletes } from "@/lib/server-roster";
import { readCollection } from "@/lib/db/collections";
import { getRehabItems, medicalStaff, getSeedIntakes, getSeedDiaryEntries } from "@/lib/medical";
import type { MedicalClosure, MedicalIntake, MedicalRecord, PhysioDiaryEntry } from "@/lib/types";
import { DiarioClient } from "@/components/medica/DiarioClient";

export const dynamic = "force-dynamic";

export default async function DiarioPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  const staff = medicalStaff(client.staff);
  const physio = staff.find((s) => s.role.toLowerCase().includes("fisio")) ?? staff[0];
  // Collezioni DB risolte lato server → lista "atleti in terapia" già corretta al primo render.
  const [resolvedAthletes, initialMedical, initialIntakes, initialClosures, initialEntries] = await Promise.all([
    getResolvedAthletes(clientId),
    readCollection<MedicalRecord>(`medical:${clientId}`).catch(() => [] as MedicalRecord[]),
    readCollection<MedicalIntake>(`intake:${clientId}`).catch(() => [] as MedicalIntake[]),
    readCollection<MedicalClosure>(`medical-closed:${clientId}`).catch(() => [] as MedicalClosure[]),
    readCollection<PhysioDiaryEntry>(`physio-diary:${clientId}`).catch(() => [] as PhysioDiaryEntry[]),
  ]);
  return (
    <DiarioClient
      clientId={clientId}
      seedAthletes={resolvedAthletes}
      seedMedical={getMedical(clientId)}
      seedIntakes={getSeedIntakes(clientId, physio?.name, physio?.role)}
      seedEntries={getSeedDiaryEntries(clientId, staff)}
      initialMedical={initialMedical}
      initialIntakes={initialIntakes}
      initialClosures={initialClosures}
      initialEntries={initialEntries}
      rehabItems={getRehabItems(clientId)}
      staff={staff}
    />
  );
}
