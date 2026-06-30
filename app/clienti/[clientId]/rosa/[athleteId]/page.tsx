import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthlete, getAthletes, getAthleteTests, getEvents, getGps, getMedical, getSeedAttendance, getTeamAverageKpi } from "@/lib/data";
import { getAthleteMeasurements } from "@/lib/measurements";
import { getAthleteReadiness, WELLNESS, SCALE_MAX } from "@/lib/readiness";
import { sectionHref } from "@/lib/nav";
import { KPI_LABEL, delta, flagsOf, tierOf, TIER_META, clusterOf } from "@/lib/perf";
import { readCollection } from "@/lib/db/collections";
import type { AthleteTestSession, MedicalClosure, MedicalRecord, PhysicalKpi } from "@/lib/types";
import type { MedicalPhaseOverride } from "@/lib/medical-flow";
import { AthleteHeader } from "@/components/rosa/AthleteHeader";
import { AthleteAnthropometrics } from "@/components/rosa/AthleteAnthropometrics";
import { ClinicalRecord } from "@/components/rosa/ClinicalRecord";
import { AthleteTestHistory } from "@/components/rosa/AthleteTestHistory";
import { AthleteMeasurements } from "@/components/rosa/AthleteMeasurements";
import { AthleteAttendance } from "@/components/rosa/AthleteAttendance";
import { AthleteAgenda } from "@/components/rosa/AthleteAgenda";
import { AthleteReport } from "@/components/rosa/AthleteReport";
import { Icon } from "@/components/Icon";
import { InteractiveRadar } from "@/components/InteractiveRadar";
import { ProgressChart } from "@/components/programmazione/ProgressChart";
import { DeltaPill, Panel } from "@/components/ui";

const KEYS: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];

export default async function AthletePage({ params }: { params: Promise<{ clientId: string; athleteId: string }> }) {
  const { clientId, athleteId } = await params;
  const client = getClient(clientId);
  const a = getAthlete(athleteId);
  if (!client || !a || a.clientId !== clientId) notFound();

  const p = a.profile;
  const flags = flagsOf(p);
  const team = getTeamAverageKpi(clientId);
  const tier = tierOf(p.pIndex);
  const tierMeta = TIER_META[tier];
  const cluster = clusterOf(p);

  const rdHistory = getAthleteReadiness(clientId, athleteId);
  const rdLatest = rdHistory.length ? rdHistory[rdHistory.length - 1] : null;
  const rdPrev = rdHistory.length > 1 ? rdHistory[rdHistory.length - 2].score : null;
  const rdChart = rdHistory.map((e) => ({ label: fmtShort(e.date), value: e.score }));

  const tests = getAthleteTests(athleteId);
  const medical = getMedical(clientId);
  // Record clinici reali (creati/aggiornati dall'Area Medica) letti dal DB lato
  // server, così la cartella e l'agenda dell'atleta partono già allineate.
  const [dbMedical, dbClosures, dbPhase, dbTests] = await Promise.all([
    readCollection<MedicalRecord>(`medical:${clientId}`).catch(() => [] as MedicalRecord[]),
    readCollection<MedicalClosure>(`medical-closed:${clientId}`).catch(() => [] as MedicalClosure[]),
    readCollection<MedicalPhaseOverride>(`medical-phase:${clientId}`).catch(() => [] as MedicalPhaseOverride[]),
    readCollection<AthleteTestSession>(`athlete-tests:${clientId}`).catch(() => [] as AthleteTestSession[]),
  ]);
  const athleteTests = dbTests.filter((t) => t.athleteId === athleteId);
  const gps = getGps(clientId).filter((g) => g.athleteId === athleteId).sort((x, y) => y.date.localeCompare(x.date))[0];

  return (
    <div className="mx-auto max-w-6xl fade-up">
      <Link href={sectionHref(clientId, "rosa")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <Icon name="arrowLeft" size={15} /> Rosa
      </Link>

      {/* Hero */}
      <AthleteHeader clientId={clientId} athlete={a} rdScore={rdLatest?.score ?? null} rdPrev={rdPrev} />

      {/* 1 · Antropometria */}
      <Panel title="Antropometria" className="mb-6 brand-topline">
        <AthleteAnthropometrics athlete={a} />
      </Panel>

      {/* 2 · Cartella clinica (collegata all'Area Medica) */}
      <div className="mb-6">
        <ClinicalRecord clientId={clientId} clientName={client.name} athlete={a} seedMedical={medical} seedEvents={getEvents(clientId)} initialMedical={dbMedical} initialClosures={dbClosures} initialPhase={dbPhase} />
      </div>

      {/* 3 · Profilo atletico TESTÀRE */}
      <Panel
        title={<>Profilo atletico · <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={150} height={38} className="h-[15px] w-auto" /></>}
        className="mb-6 brand-topline"
        action={<AthleteReport athlete={a} team={team} tests={tests} />}
      >
        <div className="grid gap-7 p-5 lg:grid-cols-[380px_1fr]">
          {/* Radar + P-Index */}
          {/* Radar — colonna sinistra dedicata */}
          <div className="flex items-center justify-center">
            <InteractiveRadar kpi={p} prev={p.prev} team={team} size={360} />
          </div>

          {/* P-Index + dimensioni + cluster + screening */}
          <div className="space-y-5">
            {/* P-Index composito */}
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold leading-none" style={{ color: tierMeta.color }}>{p.pIndex}</span>
                <span className="text-2xl font-bold" style={{ color: tierMeta.color }}>°</span>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">P-Index composito</div>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: tierMeta.color, backgroundColor: tierMeta.bg }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tierMeta.color }} /> {tier} · {tierMeta.range}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              {KEYS.map((k) => {
                const d = delta(p, k);
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-semibold">{KPI_LABEL[k]}</span>
                      <span className="flex items-center gap-2">
                        <DeltaPill value={d.value} significant={d.significant} />
                        <span className="font-mono font-bold">{p[k]}°</span>
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-background">
                      <div className="absolute left-0 top-0 h-full rounded-full bg-muted-2/40" style={{ width: `${p.prev[k]}%` }} />
                      <div className="brand-bg absolute left-0 top-0 h-full rounded-full" style={{ width: `${p[k]}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cluster di lavoro */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
              <span className="brand-soft-bg brand-text flex h-7 w-7 items-center justify-center rounded-lg"><Icon name="target" size={14} /></span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Cluster neuromuscolare</span>
              <span className="brand-text ml-auto text-sm font-bold">{cluster}</span>
            </div>

            {/* Screening deficit */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Screening deficit <span className="font-normal normal-case text-muted-2">(Bahr 2016)</span></div>
              <div className="flex flex-wrap items-center gap-2">
                {flags.length === 0 ? (
                  <span className="flex items-center gap-2 text-sm font-medium text-good"><Icon name="sparkle" size={16} /> Nessun deficit osservabile — atleta senza flag attivi.</span>
                ) : (
                  flags.map((f) => (
                    <span key={f.code} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 py-1.5 pl-1.5 pr-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 text-[11px] font-bold text-white">{f.code}</span>
                      <span className="text-[13px] font-medium text-red-700">{f.label}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 3a · Storico valutazioni neuromuscolari (report TESTÀRE importati) */}
      <div className="mb-6">
        <AthleteTestHistory clientId={clientId} athleteId={athleteId} initial={athleteTests} />
      </div>

      {/* 3b · Ultimo rilevamento GPS */}
      <Panel title="Ultimo rilevamento GPS" className="mb-6" action={<Link href={sectionHref(clientId, "carico")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Carico <Icon name="chevron" size={13} /></Link>}>
        {gps ? (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
            <GpsTile icon="load" label="Distanza" value={`${(gps.totalDistanceM / 1000).toFixed(1)}`} unit="km" />
            <GpsTile icon="trend" label="Alta velocità" value={`${gps.highSpeedM}`} unit="m" />
            <GpsTile icon="bolt" label="Sprint" value={`${gps.sprintCount}`} unit="" />
            <GpsTile icon="stopwatch" label="Vel. max" value={`${gps.maxSpeedKmh}`} unit="km/h" />
            <GpsTile icon="chart" label="Player load" value={`${gps.playerLoad}`} unit="AU" />
            <GpsTile icon="pulse" label="FC media/max" value={`${gps.avgHr}/${gps.maxHr}`} unit="bpm" />
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-muted">Nessun dato GPS recente.</p>
        )}
      </Panel>

      {/* 3c · Misurazioni interne (collegate a Test → Misurazioni) */}
      <div className="mb-6">
        <AthleteMeasurements clientId={clientId} athleteId={athleteId} seed={getAthleteMeasurements(clientId, athleteId)} />
      </div>

      {/* 4 · Readiness del singolo atleta */}
      {rdLatest && (
        <Panel
          title="Readiness · andamento"
          className="mb-6 brand-topline"
          action={<Link href={sectionHref(clientId, "readiness")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Readiness <Icon name="chevron" size={13} /></Link>}
        >
          <div className="grid gap-6 p-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ProgressChart data={rdChart} unit="%" height={190} />
            </div>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Ultimo check-in</div>
              <div className="space-y-2.5">
                {WELLNESS.map((it) => {
                  const v = rdLatest.items[it.key] ?? 0;
                  return (
                    <div key={it.key}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span style={{ color: it.color }}><Icon name={it.icon} size={13} /></span> {it.label}
                        </span>
                        <span className="font-mono font-bold">{v}/{SCALE_MAX}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full" style={{ width: `${(v / SCALE_MAX) * 100}%`, backgroundColor: it.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 5 · Registro presenze */}
      <div className="mb-6">
        <AthleteAttendance clientId={clientId} athleteId={athleteId} athletes={getAthletes(clientId)} seedEvents={getEvents(clientId)} seedAttendance={getSeedAttendance(clientId)} />
      </div>

      {/* 6 · Agenda dell'atleta */}
      <AthleteAgenda clientId={clientId} athleteId={athleteId} athletes={getAthletes(clientId)} seedEvents={getEvents(clientId)} seedMedical={medical} initialMedical={dbMedical} initialClosures={dbClosures} initialPhase={dbPhase} />
    </div>
  );
}

function GpsTile({ icon, label, value, unit }: { icon: string; label: string; value: string; unit: string }) {
  return (
    <div className="lift rounded-xl border border-border bg-background p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon name={icon} size={13} className="brand-text" /> {label}
      </div>
      <div className="mt-1.5 text-xl font-extrabold leading-none tnum">{value}{unit && <span className="ml-1 text-[12px] font-medium text-muted-2">{unit}</span>}</div>
    </div>
  );
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
