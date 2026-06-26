import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getMedical } from "@/lib/data";
import { medicalStaff, getSeedIntakes } from "@/lib/medical";
import { PresaInCaricoClient } from "@/components/medica/PresaInCaricoClient";

export default async function PresaInCaricoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  const staff = medicalStaff(client.staff);
  const physio = staff.find((s) => s.role.toLowerCase().includes("fisio")) ?? staff[0];
  return (
    <PresaInCaricoClient
      clientId={clientId}
      seedAthletes={getAthletes(clientId)}
      seedMedical={getMedical(clientId)}
      seedIntakes={getSeedIntakes(clientId, physio?.name, physio?.role)}
      staff={staff}
    />
  );
}
