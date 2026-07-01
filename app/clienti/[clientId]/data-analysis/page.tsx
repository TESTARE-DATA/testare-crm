import { redirect } from "next/navigation";
import { sectionHref } from "@/lib/nav";

// Data Analysis è ora un sotto-insieme di Area Performance: la sezione dedicata
// non esiste più, i vecchi link vengono reindirizzati alla nuova landing.
export default async function DataAnalysisRedirect({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  redirect(sectionHref(clientId, "preparazione-atletica"));
}
