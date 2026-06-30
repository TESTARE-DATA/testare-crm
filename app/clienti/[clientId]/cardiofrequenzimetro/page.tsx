import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes } from "@/lib/data";
import { getMergedGps } from "@/lib/server-gps";
import { PageHeader, Panel } from "@/components/ui";
import { DailyView } from "@/components/data-analysis/DailyView";
import { isMatchDay } from "@/lib/dataAnalysis";

export default async function CardioPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = await getMergedGps(clientId);
  const lite = athletes.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, role: a.role, shirtNumber: a.shirtNumber }));

  // Trend TRIMP squadra (longitudinale, di contesto).
  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const trend = dates.map((d) => {
    const recs = gps.filter((g) => g.date === d);
    return { date: d, trimp: recs.reduce((s, g) => s + g.trimp, 0), isMatch: isMatchDay(recs) };
  });
  const maxTrimp = Math.max(1, ...trend.map((t) => t.trimp));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Cardiofrequenzimetro" subtitle="Vista giornaliera del carico cardiovascolare: TRIMP, FC e zone HR per squadra, reparto e singolo, con baseline 7/28g e flag" icon="pulse" />

      {/* VISTA GIORNALIERA — schema condiviso della Data Analysis */}
      <DailyView clientId={clientId} area="cardio" athletes={lite} records={gps} />

      {/* Trend TRIMP squadra */}
      <Panel title="Andamento TRIMP squadra" className="mb-6">
        <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
          {trend.map((t) => (
            <div key={t.date} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center">
                <div className="brand-bg w-2/3 rounded-t" style={{ height: `${(t.trimp / maxTrimp) * 100}%` }} title={`TRIMP ${t.trimp}`} />
              </div>
              <span className={`text-[10px] ${t.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{t.isMatch ? "GARA" : `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}`}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
