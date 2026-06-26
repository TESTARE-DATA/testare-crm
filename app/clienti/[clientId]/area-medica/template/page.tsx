import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getRehabItems, getRehabTemplates } from "@/lib/medical";
import { MedicalTemplateClient } from "@/components/medica/MedicalTemplateClient";

export default async function MedicalTemplatePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <MedicalTemplateClient clientId={clientId} seedTemplates={getRehabTemplates(clientId)} items={getRehabItems(clientId)} seedCount={getAthletes(clientId).length} />;
}
