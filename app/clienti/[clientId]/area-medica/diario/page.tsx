import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getMedical } from "@/lib/data";
import { getResolvedAthletes } from "@/lib/server-roster";
import { readCollection } from "@/lib/db/collections";
import { getRehabItems, areaOfRole, medicalStaff, getSeedIntakes } from "@/lib/medical";
import type { MedicalClosure, MedicalIntake, MedicalRecord, PhysioDiaryEntry, StaffMember } from "@/lib/types";
import { DiarioClient } from "@/components/medica/DiarioClient";

export const dynamic = "force-dynamic";

const TREATMENTS = [
  "Tecarterapia + crioterapia",
  "Terapia manuale + mobilità articolare",
  "Isometria + propriocezione",
  "Laserterapia + esercizi rieducativi",
];
const addDays = (iso: string, d: number) => { const dt = new Date(iso + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + d); return dt.toISOString().slice(0, 10); };

/** Sedute seed deterministiche per gli episodi attivi (così il diario è popolato). */
function buildSeed(clientId: string, staff: StaffMember[]): PhysioDiaryEntry[] {
  const physio = staff.find((s) => s.role.toLowerCase().includes("fisio")) ?? staff[0];
  const active = getMedical(clientId).filter((m) => m.phase !== "conclusa");
  const out: PhysioDiaryEntry[] = [];
  active.forEach((m, mi) => {
    for (let k = 0; k < 2; k++) {
      const painPost = Math.max(0, 5 - k * 2 - (mi % 2));
      out.push({
        id: `${clientId}-diary-seed-${m.id}-${k}`,
        clientId,
        athleteId: m.athleteId,
        date: addDays(m.date, 2 + k * 4),
        area: m.bodyPart,
        treatment: TREATMENTS[(mi + k) % TREATMENTS.length],
        durationMin: 25 + ((mi + k) % 3) * 10,
        // Pre/post: dolore in calo, funzione in miglioramento col procedere del percorso.
        painPre: Math.min(10, painPost + 2),
        painPost,
        funcPre: Math.min(10, 4 + k * 2),
        funcPost: Math.min(10, 6 + k * 2),
        notes: k === 0 ? "Fase iniziale, buona tolleranza." : "Progressione del carico.",
        author: physio?.name,
        authorArea: physio ? areaOfRole(physio.role) : undefined,
      });
    }
  });
  return out;
}

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
      seedEntries={buildSeed(clientId, staff)}
      initialMedical={initialMedical}
      initialIntakes={initialIntakes}
      initialClosures={initialClosures}
      initialEntries={initialEntries}
      rehabItems={getRehabItems(clientId)}
      staff={staff}
    />
  );
}
