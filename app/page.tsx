import { CLIENTS } from "@/lib/clients";
import { getAthletes, getClientStats } from "@/lib/data";
import { getReadinessMap } from "@/lib/readiness";
import { DashboardView, type ClientMeta } from "@/components/overview/DashboardView";

export default function DashboardPage() {
  const clients: ClientMeta[] = CLIENTS.map((c) => ({
    id: c.id, name: c.name, shortName: c.shortName, city: c.city, since: c.since,
    plan: c.plan, status: c.status, logo: c.logo, colors: c.colors, staffCount: c.staff.length,
  }));
  const seeds = Object.fromEntries(CLIENTS.map((c) => [c.id, getAthletes(c.id)]));
  const readiness = Object.fromEntries(CLIENTS.map((c) => [c.id, getReadinessMap(c.id)]));
  const events = Object.fromEntries(CLIENTS.map((c) => [c.id, getClientStats(c.id).upcomingEvents]));
  const todayLabel = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return <DashboardView clients={clients} seeds={seeds} readiness={readiness} events={events} todayLabel={todayLabel} />;
}
