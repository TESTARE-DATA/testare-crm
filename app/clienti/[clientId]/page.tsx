import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getEvents, isoDay } from "@/lib/data";
import { getCampionato, type MatchRow } from "@/lib/campionato";
import { getReadinessMap, getTeamReadinessTrend } from "@/lib/readiness";
import { sectionHref } from "@/lib/nav";
import { OverviewTop } from "@/components/overview/OverviewTop";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

export default async function ClientOverview({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const athletes = getAthletes(clientId);
  const today = isoDay(0);
  const readinessMap = getReadinessMap(clientId);
  const readinessTrend = getTeamReadinessTrend(clientId);
  const events = getEvents(clientId);

  // Prossima partita di campionato (live, se configurato e disponibile).
  const champ = await getCampionato(clientId);
  const nextMatch = champ.state === "ok" ? champ.scheduled[0] : undefined;

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <OverviewTop
        client={{ id: clientId, name: client.name, city: client.city, foundedYear: client.foundedYear, logo: client.logo, colors: client.colors }}
        seed={athletes}
        readiness={readinessMap}
        readinessTrend={readinessTrend}
        events={events}
        today={today}
        banner={nextMatch ? <NextMatchBanner clientId={clientId} match={nextMatch} /> : null}
      />

      {/* Staff tecnico */}
      <Panel title="Staff tecnico" className="mt-5 brand-topline" action={<span className="text-[12px] text-muted">{client.staff.length} membri</span>}>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {client.staff.map((m) => <StaffCard key={m.name} member={m} />)}
        </div>
      </Panel>
    </div>
  );
}

function StaffCard({ member }: { member: { name: string; role: string; email?: string; phone?: string } }) {
  const [first, ...rest] = member.name.split(" ");
  return (
    <div className="rounded-xl border border-border p-4 transition-colors hover:bg-background">
      <div className="flex items-center gap-3">
        <Avatar firstName={first} lastName={rest.join(" ") || first} size={42} />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{member.name}</div>
          <div className="truncate text-[12px] text-muted">{member.role}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {member.phone && (
          <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="group flex items-center gap-2 text-[13px] text-foreground/80 transition-colors hover:text-foreground">
            <span className="brand-soft-bg brand-text flex h-7 w-7 items-center justify-center rounded-lg"><Icon name="bell" size={14} /></span>
            {member.phone}
          </a>
        )}
        {member.email && (
          <a href={`mailto:${member.email}`} className="group flex items-center gap-2 text-[13px] text-foreground/80 transition-colors hover:text-foreground">
            <span className="brand-soft-bg brand-text flex h-7 w-7 items-center justify-center rounded-lg"><Icon name="link" size={14} /></span>
            <span className="truncate">{member.email}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function NextMatchBanner({ clientId, match }: { clientId: string; match: MatchRow }) {
  const d = new Date(match.utcDate);
  const day = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    <Link href={sectionHref(clientId, "campionato")} className="card card-hover brand-topline mt-5 flex items-center gap-4 px-5 py-4">
      <span className="brand-soft-bg brand-text flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><Icon name="trophy" size={22} /></span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Prossima · {match.competition}</div>
        <div className="mt-0.5 flex items-center gap-2 text-base font-bold">
          <MatchCrest crest={match.homeCrest} />
          <span className="truncate">{match.homeTeam}</span>
          <span className="text-muted-2">vs</span>
          <MatchCrest crest={match.awayCrest} />
          <span className="truncate">{match.awayTeam}</span>
        </div>
      </div>
      <div className="ml-auto hidden text-right sm:block">
        <div className="text-[13px] font-semibold capitalize">{day}</div>
        <div className="text-[12px] text-muted">ore {time}</div>
      </div>
      <Icon name="chevron" size={18} className="text-muted-2" />
    </Link>
  );
}

function MatchCrest({ crest }: { crest: string }) {
  if (!crest) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={crest} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain" />;
}
