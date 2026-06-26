"use client";

import Link from "next/link";
import type { Athlete } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { squadComposition } from "@/lib/squad-insights";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/overview/CountUp";

/**
 * KPI di composizione della rosa: età media, nuovi arrivi (primo anno),
 * più giovane/più esperto, prodotti del vivaio, mix nazionalità (ITA/UE/Extra-UE).
 * Tutto derivato dalla rosa risolta → reagisce alle modifiche. Tile navigabili.
 */
export function SquadComposition({ clientId, athletes, photos }: { clientId: string; athletes: Athlete[]; photos: Record<string, string> }) {
  const c = squadComposition(athletes);
  const total = Math.max(1, c.count);
  const rosa = sectionHref(clientId, "rosa");
  const natSegs = [
    { key: "ita", n: c.nations.ita, color: "var(--good)", label: "Italiani" },
    { key: "eu", n: c.nations.eu, color: "var(--elite)", label: "UE" },
    { key: "extra", n: c.nations.extra, color: "#7c3aed", label: "Extra-UE" },
  ].filter((s) => s.n > 0);

  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Età media */}
      <Tile icon="users" label="Età media">
        <div className="text-3xl font-bold tracking-tight"><CountUp value={c.avgAge} decimals={1} /><span className="ml-1 text-base font-medium text-muted-2">anni</span></div>
      </Tile>

      {/* Nuovi arrivi (primo anno) */}
      <Tile icon="sparkle" label="Nuovi (primo anno)">
        <div className="text-3xl font-bold tracking-tight brand-text"><CountUp value={c.firstYear.length} /></div>
        <div className="mt-0.5 text-[12px] text-muted">arrivati questa stagione</div>
      </Tile>

      {/* Vivaio / settore giovanile */}
      <Tile icon="trophy" label="Dal settore giovanile">
        <div className="text-3xl font-bold tracking-tight"><CountUp value={c.youth.length} /></div>
        <div className="mt-0.5 text-[12px] text-muted"><CountUp value={Math.round((c.youth.length / total) * 100)} />% della rosa cresciuti nel vivaio</div>
      </Tile>

      {/* Più giovane */}
      {c.youngest && <PlayerTile clientId={clientId} label="Più giovane" item={c.youngest} photos={photos} accent="var(--good)" />}

      {/* Più esperto */}
      {c.oldest && <PlayerTile clientId={clientId} label="Più esperto" item={c.oldest} photos={photos} accent="var(--warn)" />}

      {/* Nazionalità */}
      <Link href={rosa} className="lift group/nat block rounded-xl border border-border bg-background p-3.5 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2">
          <Icon name="building" size={15} className="text-muted" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Nazionalità</span>
          <Icon name="chevron" size={14} className="ml-auto text-muted-2 transition-transform duration-200 group-hover/nat:translate-x-0.5" />
        </div>
        <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-surface">
          {natSegs.map((s) => <div key={s.key} className="transition-[filter] duration-200 group-hover/nat:brightness-105" style={{ width: `${(s.n / total) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${s.n}`} />)}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {natSegs.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <b className="tnum">{s.n}</b> <span className="text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </Link>
    </div>
  );
}

function Tile({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="lift rounded-xl border border-border bg-background p-3.5">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={15} className="text-muted" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PlayerTile({ clientId, label, item, photos, accent }: { clientId: string; label: string; item: { athlete: Athlete; age: number }; photos: Record<string, string>; accent: string }) {
  const a = item.athlete;
  return (
    <Link href={`${sectionHref(clientId, "rosa")}/${a.id}`} className="lift group/p block rounded-xl border border-border bg-background p-3.5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
        <Icon name="chevron" size={14} className="ml-auto text-muted-2 transition-transform duration-200 group-hover/p:translate-x-0.5" />
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <Avatar firstName={a.firstName} lastName={a.lastName} photoUrl={photos[a.id] ?? a.photoUrl} size={38} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight">{a.firstName} {a.lastName}</div>
          <div className="text-[12px] text-muted"><span className="tnum">{item.age}</span> anni · {a.nationality}</div>
        </div>
      </div>
    </Link>
  );
}
