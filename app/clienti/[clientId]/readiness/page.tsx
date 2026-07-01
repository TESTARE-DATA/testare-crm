import Image from "next/image";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getReadinessEngine, getReadinessTeam } from "@/lib/readinessEngine";
import { ReadinessClient } from "@/components/readiness/ReadinessClient";
import { Methodology } from "@/components/readiness/Methodology";

export default async function ReadinessPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const states = getReadinessEngine(clientId);
  const team = getReadinessTeam(clientId);

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-6 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}
      >
        <Image src={client.logo} alt="" aria-hidden width={220} height={220} className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 object-contain opacity-[0.10]" />
        <div className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
          <span className="dot-live inline-flex h-1.5 w-1.5 rounded-full bg-white" /> Readiness · benessere quotidiano
        </div>
        <h1 className="relative mt-1 text-2xl font-extrabold tracking-tight">Prontezza · {client.name}</h1>
        <p className="relative mt-1 text-[13px] opacity-85">Check-in mattutino → readiness individuale (z-score sulla baseline dell&apos;atleta) per atleta e squadra.</p>
      </div>

      <ReadinessClient clientId={clientId} states={states} team={team} />

      <Methodology />
    </div>
  );
}
