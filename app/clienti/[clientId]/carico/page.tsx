import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getGps, getEvents, getSeedAttendance } from "@/lib/data";
import { PageHeader, Panel } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CaricoPlanned } from "@/components/carico/CaricoPlanned";
import { DailyView } from "@/components/data-analysis/DailyView";
import { isMatchDay } from "@/lib/dataAnalysis";

export default async function CaricoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const gps = getGps(clientId);
  const lite = athletes.map((a) => ({ id: a.id, firstName: a.firstName, lastName: a.lastName, role: a.role, shirtNumber: a.shirtNumber }));

  // Trend squadra interno (longitudinale, di contesto sotto la vista giornaliera).
  const dates = [...new Set(gps.map((g) => g.date))].sort();
  const trend = dates.map((d) => {
    const recs = gps.filter((g) => g.date === d);
    return { date: d, internal: recs.reduce((s, g) => s + g.sRPE, 0), isMatch: isMatchDay(recs) };
  });
  const maxInt = Math.max(1, ...trend.map((t) => t.internal));

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Carico" subtitle="Vista giornaliera del carico interno (sRPE): squadra, reparto e singolo atleta, con baseline 7/28g, pianificato vs svolto e flag" icon="load" />

      {/* VISTA GIORNALIERA — schema condiviso della Data Analysis */}
      <DailyView clientId={clientId} area="carico" athletes={lite} records={gps} />

      {/* PIANIFICATO vs ASSORBITO — dal calendario e dalle presenze (complementare) */}
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-2"><Icon name="target" size={15} className="brand-text" /> Programmato vs assorbito · dal calendario</h2>
      <CaricoPlanned clientId={clientId} athletes={athletes} seedEvents={getEvents(clientId)} seedAttendance={getSeedAttendance(clientId)} />

      {/* Trend carico interno squadra */}
      <Panel title="Andamento carico interno squadra · sRPE" className="mb-6">
        <div className="flex items-end gap-2 overflow-x-auto px-5 py-5" style={{ minHeight: 180 }}>
          {trend.map((t) => (
            <div key={t.date} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end justify-center">
                <div className="brand-bg w-2/3 rounded-t" style={{ height: `${(t.internal / maxInt) * 100}%` }} title={`sRPE ${t.internal} AU`} />
              </div>
              <span className={`text-[10px] ${t.isMatch ? "font-bold text-bad" : "text-muted-2"}`}>{t.isMatch ? "GARA" : `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}`}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
