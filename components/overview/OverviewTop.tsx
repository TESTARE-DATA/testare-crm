"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Athlete, CalendarEvent } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useRoster } from "@/lib/useRoster";
import { usePhotos } from "@/lib/usePhotos";
import { Panel, StatCard } from "@/components/ui";
import { ReadinessTrendChart, type TrendPoint } from "@/components/overview/ReadinessTrendChart";
import { AlertAthletes } from "@/components/overview/AlertAthletes";
import { WorkloadSummary } from "@/components/overview/WorkloadSummary";
import { SquadComposition } from "@/components/overview/SquadComposition";
import { CountUp } from "@/components/overview/CountUp";
import { Reveal } from "@/components/overview/Reveal";
import { Icon } from "@/components/Icon";

const ROLES = ["Portiere", "Difensore", "Centrocampista", "Attaccante"] as const;

/** Parte alta della Panoramica (hero + KPI + disponibilità + readiness), tutta
 *  derivata dalla ROSA RISOLTA: riflette aggiunte/modifiche/rimozioni in tempo reale. */
export function OverviewTop({
  client,
  seed,
  readiness,
  readinessTrend,
  events,
  today,
  banner,
}: {
  client: { id: string; name: string; city: string; foundedYear: number; logo: string; colors: { primary: string; primaryDark: string; onPrimary: string } };
  seed: Athlete[];
  readiness: Record<string, number>;
  readinessTrend: TrendPoint[];
  events: CalendarEvent[];
  today: string;
  banner?: ReactNode;
}) {
  const { athletes } = useRoster(client.id, seed);
  const { photos } = usePhotos(client.id);
  const clientId = client.id;

  const n = athletes.length;
  const count = (s: string) => athletes.filter((a) => a.status === s).length;
  const available = count("disponibile");
  const injured = count("infortunato");
  const recovering = count("in recupero");
  const resting = count("a riposo");
  const unavailable = injured + recovering;
  const availPct = n ? Math.round((available / n) * 100) : 0;

  // Readiness squadra: stesso valore della sezione Readiness (ultimo punto del trend = media oggi dal motore EBM).
  const teamRd = readinessTrend.length ? readinessTrend[readinessTrend.length - 1].avg : 0;

  const segs = [
    { n: available, color: "var(--good)", label: "Disponibili" },
    { n: recovering, color: "var(--warn)", label: "In recupero" },
    { n: injured, color: "var(--bad)", label: "Infortunati" },
    { n: resting, color: "var(--muted-2)", label: "A riposo" },
  ].filter((x) => x.n > 0);
  const byRole = ROLES.map((r) => {
    const grp = athletes.filter((a) => a.role === r);
    return { role: r, total: grp.length, avail: grp.filter((a) => a.status === "disponibile").length };
  });

  return (
    <>
      {/* Hero brandizzato */}
      <div className="sheen group/hero relative mb-6 overflow-hidden rounded-2xl p-6 shadow-sm" style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}>
        <Image src={client.logo} alt="" aria-hidden width={260} height={260} className="pointer-events-none absolute -right-6 -top-10 h-60 w-60 object-contain opacity-[0.10] transition-transform duration-700 group-hover/hero:scale-105 group-hover/hero:rotate-3" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Image src={client.logo} alt={client.name} width={46} height={46} className="object-contain" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                <span className="dot-live inline-flex h-1.5 w-1.5 rounded-full bg-white" /> Panoramica · Stagione in corso
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-balance">{client.name}</h1>
              <p className="text-[13px] opacity-85">{client.city} · {client.foundedYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HeroMetric label="Atleti" value={n} />
            <span className="h-9 w-px bg-white/20" />
            <HeroMetric label="Disponibilità" value={availPct} suffix="%" />
            <span className="h-9 w-px bg-white/20" />
            <HeroMetric label="Readiness" value={teamRd} />
          </div>
        </div>
      </div>

      {/* KPI rosa */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Atleti in rosa" value={<CountUp value={n} />} tone="brand" icon="users" />
        <StatCard label="Disponibili" value={<CountUp value={available} />} tone="good" hint={`${availPct}% della rosa`} icon="live" />
        <StatCard label="Indisponibili" value={<CountUp value={unavailable} />} tone="warn" icon="medical" hint={`${injured} infortunati · ${recovering} in recupero`} />
      </div>

      {/* Composizione rosa — subito sotto le KPI di rosa */}
      <Reveal className="mt-5">
        <Panel title="Composizione rosa" className="brand-topline" action={<Link href={sectionHref(clientId, "rosa")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Rosa <Icon name="chevron" size={13} /></Link>}>
          <SquadComposition clientId={clientId} athletes={athletes} photos={photos} />
        </Panel>
      </Reveal>

      {banner}

      {/* Disponibilità squadra — a tutta larghezza */}
      <Reveal className="mt-5">
        <Panel title="Disponibilità squadra" className="brand-topline">
          <div className="p-5">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-extrabold text-good"><CountUp value={availPct} /><span className="text-xl">%</span></span>
              <div className="flex-1">
                <div className="grow-right flex h-4 w-full overflow-hidden rounded-full bg-background">
                  {segs.map((seg) => <div key={seg.label} style={{ width: `${(seg.n / Math.max(1, n)) * 100}%`, backgroundColor: seg.color }} title={`${seg.label}: ${seg.n}`} />)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {segs.map((seg) => (
                    <span key={seg.label} className="flex items-center gap-1.5 text-[12px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} /><b className="tnum">{seg.n}</b> <span className="text-muted">{seg.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {byRole.map((r) => {
                const pct = r.total ? Math.round((r.avail / r.total) * 100) : 0;
                return (
                  <Link key={r.role} href={sectionHref(clientId, "rosa")} className="lift group/role block rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted">{r.role}</span>
                      <Icon name="chevron" size={13} className="text-muted-2 transition-transform duration-200 group-hover/role:translate-x-0.5" />
                    </div>
                    <div className="mt-0.5 text-lg font-bold tnum">{r.avail}<span className="text-sm font-medium text-muted-2">/{r.total}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div className="grow-right h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 75 ? "var(--good)" : pct >= 50 ? "var(--warn)" : "var(--bad)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Panel>
      </Reveal>

      {/* Readiness di gruppo (andamento) + atleti in alert */}
      <Reveal className="mt-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel
            title="Stato di salute di gruppo · andamento"
            className="brand-topline lg:col-span-2"
            action={<Link href={sectionHref(clientId, "readiness")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Apri <Icon name="chevron" size={13} /></Link>}
          >
            <ReadinessTrendChart trend={readinessTrend} />
          </Panel>

          <Panel
            title="Atleti in alert"
            className="brand-topline"
            action={<span className="text-[12px] text-muted">≥2 flag</span>}
          >
            <AlertAthletes clientId={clientId} athletes={athletes} photos={photos} readiness={readiness} />
          </Panel>
        </div>
      </Reveal>

      {/* Lavoro svolto */}
      <Reveal className="mt-5">
        <Panel title="Lavoro svolto" className="brand-topline" action={<Link href={sectionHref(clientId, "calendario")} className="brand-text inline-flex items-center gap-1 text-[13px] font-semibold hover:underline">Calendario <Icon name="chevron" size={13} /></Link>}>
          <WorkloadSummary clientId={clientId} events={events} today={today} />
        </Panel>
      </Reveal>
    </>
  );
}

function HeroMetric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold leading-none tracking-tight"><CountUp value={value} />{suffix}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</div>
    </div>
  );
}
