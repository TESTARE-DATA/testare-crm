import Image from "next/image";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getRd } from "@/lib/data";
import { METRICS, buildMatrix, buildInsights } from "@/lib/intelligence";
import { DataIntelligence } from "@/components/rd/DataIntelligence";

export default async function RdPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const matrix = buildMatrix(clientId);
  const insights = buildInsights(matrix);
  const projects = getRd(clientId).map((p) => ({ title: p.title, area: p.area, status: p.status, owner: p.owner }));

  return (
    <div className="mx-auto max-w-7xl fade-up">
      {/* Hero brandizzato */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-6 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}
      >
        <Image src={client.logo} alt="" aria-hidden width={220} height={220} className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 object-contain opacity-[0.10]" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
            <span className="dot-live inline-flex h-1.5 w-1.5 rounded-full bg-white" /> R&amp;D · Data Intelligence
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Laboratorio dati · {client.name}</h1>
          <p className="mt-1 max-w-2xl text-[13px] opacity-85">
            Incrocia carico, GPS, area medica e performance. Costruisci correlazioni, leggi i segnali automatici e genera report per lo staff.
          </p>
        </div>
      </div>

      <DataIntelligence
        clientName={client.name}
        metrics={METRICS}
        matrix={matrix}
        insights={insights}
        staff={client.staff}
        projects={projects}
      />
    </div>
  );
}
