import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { TemplateSection } from "@/components/tecnica/TemplateSection";

export default async function AreaTecnicaTemplatePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();
  return <TemplateSection clientId={clientId} domain="campo" />;
}
