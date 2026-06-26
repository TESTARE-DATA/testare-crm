"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Athlete, PhysicalKpi, BrandPalette } from "@/lib/types";
import { useRostersByClient } from "@/lib/useRostersByClient";
import { readinessTier } from "@/lib/readiness-core";
import { BrandScope } from "@/components/BrandScope";
import { Icon } from "@/components/Icon";
import { Badge, StatCard } from "@/components/ui";

export interface ClientMeta {
  id: string;
  name: string;
  shortName: string;
  city: string;
  since: string;
  plan: string;
  status: string;
  logo: string;
  colors: BrandPalette;
  staffCount: number;
}

interface ClientStats {
  athletes: number;
  available: number;
  injured: number;
  recovering: number;
  resting: number;
  readiness: number;
  alert: number;
}

function flagCount(k: PhysicalKpi): number {
  let n = 0;
  if (k.forza < 50) n++;
  if (k.potenza < 50) n++;
  if (k.reattivita < 50) n++;
  if (k.simmetria < 70) n++;
  if (Math.max(k.forza, k.potenza, k.reattivita) - Math.min(k.forza, k.potenza, k.reattivita) > 35) n++;
  return n;
}

function statsOf(roster: Athlete[], rd: Record<string, number>): ClientStats {
  const c = (s: string) => roster.filter((a) => a.status === s).length;
  const rdVals = roster.map((a) => rd[a.id]).filter((v): v is number => v != null);
  return {
    athletes: roster.length,
    available: c("disponibile"),
    injured: c("infortunato"),
    recovering: c("in recupero"),
    resting: c("a riposo"),
    readiness: rdVals.length ? Math.round(rdVals.reduce((s, v) => s + v, 0) / rdVals.length) : 0,
    alert: roster.filter((a) => flagCount(a.profile) >= 2).length,
  };
}

export function DashboardView({
  clients,
  seeds,
  readiness,
  events,
  todayLabel,
}: {
  clients: ClientMeta[];
  seeds: Record<string, Athlete[]>;
  readiness: Record<string, Record<string, number>>;
  events: Record<string, number>;
  todayLabel: string;
}) {
  const rosters = useRostersByClient(seeds);
  const rows = clients.map((client) => ({
    client,
    kpi: statsOf(rosters[client.id] ?? seeds[client.id] ?? [], readiness[client.id] ?? {}),
    events: events[client.id] ?? 0,
  }));

  const totalAthletes = rows.reduce((s, x) => s + x.kpi.athletes, 0);
  const totalAvailable = rows.reduce((s, x) => s + x.kpi.available, 0);
  const totalInjured = rows.reduce((s, x) => s + x.kpi.injured, 0);
  const totalRecovering = rows.reduce((s, x) => s + x.kpi.recovering, 0);
  const totalAlert = rows.reduce((s, x) => s + x.kpi.alert, 0);
  const totalEvents = rows.reduce((s, x) => s + x.events, 0);
  const activeClients = clients.filter((c) => c.status === "attivo").length;
  const availPct = totalAthletes ? Math.round((totalAvailable / totalAthletes) * 100) : 0;
  const toWatch = totalInjured + totalRecovering;

  const attention = rows
    .map((x) => ({ ...x, score: x.kpi.injured * 2 + x.kpi.recovering + x.kpi.alert }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      {/* Hero: centro operativo */}
      <section className="card hero-mesh fade-up relative mb-6 overflow-hidden p-7">
        <div className="grad-line absolute inset-x-0 top-0" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">
              <span className="dot-live inline-flex h-2 w-2 rounded-full bg-good" /> Live · {todayLabel}
            </div>
            <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight">
              Centro operativo <span className="brand-accent-text">TESTÀRE</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Stai monitorando <b className="text-foreground">{totalAthletes} atleti</b> su{" "}
              <b className="text-foreground">{clients.length} società</b>.{" "}
              {toWatch > 0 ? (
                <>
                  <b className="text-foreground">{toWatch}</b> situazioni da seguire e{" "}
                  <b className="text-foreground">{totalEvents}</b> eventi in arrivo.
                </>
              ) : (
                <>Nessuna criticità aperta · {totalEvents} eventi in arrivo.</>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HeroChip icon="medical" label="Da seguire" value={toWatch} tone={toWatch > 0 ? "warn" : "good"} />
              <HeroChip icon="target" label="In alert" value={totalAlert} tone={totalAlert > 0 ? "warn" : "good"} />
              <HeroChip icon="calendar" label="Eventi" value={totalEvents} />
            </div>
          </div>
          <Ring pct={availPct} caption="Disponibilità rete" sub={`${totalAvailable}/${totalAthletes} atleti`} />
        </div>
      </section>

      {/* KPI globali */}
      <div className="stagger grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Clienti" value={clients.length} hint={`${activeClients} attivi`} icon="building" />
        <StatCard label="Atleti monitorati" value={totalAthletes} hint="Su tutte le società" icon="users" />
        <StatCard label="Disponibilità media" value={`${availPct}%`} tone="good" hint={`${totalAvailable} disponibili`} icon="live" />
        <StatCard label="Infortunati" value={totalInjured} tone="warn" hint={`+ ${totalRecovering} in recupero`} icon="medical" />
      </div>

      {/* Clienti + Richiede attenzione */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">I tuoi clienti</h2>
            <span className="text-sm text-muted">{clients.length} società</span>
          </div>
          <div className="stagger grid gap-4 sm:grid-cols-2">
            {rows.map(({ client, kpi }) => <ClientCard key={client.id} client={client} kpi={kpi} />)}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Richiede attenzione</h2>
            {attention.length > 0 && <Badge tone="amber">{attention.length}</Badge>}
          </div>
          <div className="card fade-up overflow-hidden">
            {attention.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="sparkle" size={22} />
                </span>
                <p className="text-sm font-medium">Tutto sotto controllo</p>
                <p className="text-[12px] text-muted">Nessuna criticità aperta sulle società.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {attention.map(({ client, kpi }) => (
                  <li key={client.id}>
                    <Link href={`/clienti/${client.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background">
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border" style={{ backgroundColor: client.colors.soft }}>
                        <Image src={client.logo} alt={client.name} width={22} height={22} className="object-contain" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{client.shortName}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          {kpi.injured > 0 && <Tag tone="bad">{kpi.injured} inf.</Tag>}
                          {kpi.recovering > 0 && <Tag tone="warn">{kpi.recovering} rec.</Tag>}
                          {kpi.alert > 0 && <Tag tone="muted">{kpi.alert} alert</Tag>}
                        </div>
                      </div>
                      <Icon name="chevron" size={16} className="text-muted-2 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client, kpi }: { client: ClientMeta; kpi: ClientStats }) {
  const availPct = kpi.athletes ? Math.round((kpi.available / kpi.athletes) * 100) : 0;
  const segs = [
    { n: kpi.available, color: "var(--good)" },
    { n: kpi.recovering, color: "var(--warn)" },
    { n: kpi.injured, color: "var(--bad)" },
    { n: kpi.resting, color: "var(--muted-2)" },
  ].filter((x) => x.n > 0);

  return (
    <BrandScope colors={client.colors} className="brand-cards">
      <Link href={`/clienti/${client.id}`} className="card card-hover sheen brand-topline group block overflow-hidden">
        <div className="relative flex items-center gap-4 overflow-hidden px-5 py-4" style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}>
          <Image src={client.logo} alt="" width={120} height={120} aria-hidden className="pointer-events-none absolute -right-3 -top-4 h-28 w-28 object-contain opacity-[0.13]" />
          <span className="relative flex h-13 w-13 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20">
            <Image src={client.logo} alt={client.name} width={40} height={40} className="object-contain" />
          </span>
          <div className="relative flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{client.name}</h3>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{client.plan}</span>
            </div>
            <p className="text-[13px] opacity-85">{client.city} · dal {fmt(client.since)}</p>
          </div>
          <Icon name="chevron" size={22} className="relative opacity-70 transition-transform group-hover:translate-x-1" />
        </div>

        <div className="px-5 pt-4">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-medium text-muted">Disponibilità rosa</span>
            <span className="font-bold">{availPct}%</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-background">
            {segs.map((seg, i) => <div key={i} style={{ width: `${(seg.n / kpi.athletes) * 100}%`, backgroundColor: seg.color }} />)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 divide-x divide-border border-t border-border">
          <MiniStat label="Atleti" value={kpi.athletes} />
          <MiniStat label="Disp." value={kpi.available} />
          <MiniStat label="Infort." value={kpi.injured} tone={kpi.injured > 0 ? "warn" : undefined} />
          <MiniStat label="Readiness" value={`${kpi.readiness}%`} color={readinessTier(kpi.readiness).color} />
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Icon name="users" size={15} /> {client.staffCount} membri staff
          </div>
          <Badge tone={client.status === "attivo" ? "green" : "amber"}>{client.status}</Badge>
        </div>
      </Link>
    </BrandScope>
  );
}

function Ring({ pct, caption, sub }: { pct: number; caption: string; sub: string }) {
  const color = pct >= 85 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="flex shrink-0 items-center gap-4 rounded-2xl">
      <div className="relative grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, var(--background-2) 0deg)` }}>
        <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-surface">
          <span className="text-2xl font-extrabold tracking-tight">{pct}%</span>
        </div>
      </div>
      <div className="hidden sm:block">
        <div className="text-sm font-semibold">{caption}</div>
        <div className="text-[12px] text-muted">{sub}</div>
      </div>
    </div>
  );
}

function HeroChip({ icon, label, value, tone }: { icon: string; label: string; value: number; tone?: "warn" | "good" }) {
  const accent = tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-foreground";
  return (
    <span className="tile inline-flex items-center gap-2 px-3 py-1.5 text-[13px]">
      <Icon name={icon} size={15} className="text-muted" />
      <span className="text-muted">{label}</span>
      <b className={accent}>{value}</b>
    </span>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: "bad" | "warn" | "muted" }) {
  const cls = tone === "bad" ? "bg-red-50 text-red-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-background text-muted";
  return <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${cls}`}>{children}</span>;
}

function MiniStat({ label, value, tone, color }: { label: string; value: ReactNode; tone?: "warn"; color?: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className={`text-xl font-bold ${tone === "warn" ? "text-amber-600" : ""}`} style={color ? { color } : undefined}>{value}</div>
      <div className="text-[10.5px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { month: "short", year: "numeric" });
}
