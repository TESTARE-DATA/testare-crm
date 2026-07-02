import { requireSuperadmin } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { CLIENTS, getClient } from "@/lib/clients";
import { getResolvedAthletes } from "@/lib/server-roster";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { PageHeader, Panel, Badge } from "@/components/ui";
import { CreateAccountForm, type AthleteOption } from "./CreateAccountForm";
import { deleteAccount } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utenti e accessi · TESTÀRE CRM" };

interface AccountRow {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  clientId: string | null;
  athleteId: string | null;
  createdAt: string;
}

async function listAccounts(): Promise<AccountRow[]> {
  const admin = getAdminClient();
  const [{ data: usersData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 500 }),
    admin.from("profiles").select("id, role, client_id, athlete_id, full_name"),
  ]);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  return (usersData?.users ?? []).map((u) => {
    const p = byId.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "—",
      fullName: (p?.full_name as string | null) ?? null,
      role: ((p?.role as Role | undefined) ?? "staff") as Role,
      clientId: (p?.client_id as string | null) ?? null,
      athleteId: (p?.athlete_id as string | null) ?? null,
      createdAt: u.created_at,
    };
  });
}

export default async function AdminPage() {
  const me = await requireSuperadmin();

  const accounts = await listAccounts();
  const athletesByClient: Record<string, AthleteOption[]> = {};
  for (const c of CLIENTS) {
    const roster = await getResolvedAthletes(c.id);
    athletesByClient[c.id] = roster.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }));
  }
  const athleteName = (clientId: string | null, athleteId: string | null) =>
    (clientId && athleteId && athletesByClient[clientId]?.find((a) => a.id === athleteId)?.name) || null;

  return (
    <div className="px-8 py-7">
      <PageHeader
        title="Utenti e accessi"
        subtitle="Gli account si creano solo da qui (accesso su invito): niente auto-registrazione."
        icon="users"
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title="Nuovo account">
          <div className="p-4">
            <p className="mb-4 text-[12.5px] text-muted">Crea l&apos;utente e comunica le credenziali alla persona.</p>
            <CreateAccountForm
              clients={CLIENTS.map((c) => ({ id: c.id, name: c.name }))}
              athletesByClient={athletesByClient}
            />
          </div>
        </Panel>

        <Panel title={`Account attivi (${accounts.length})`}>
          <div className="divide-y divide-border px-4">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-bold text-background">
                  {(a.fullName ?? a.email).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-40 flex-1 leading-tight">
                  <div className="text-[13.5px] font-semibold">{a.fullName ?? a.email}</div>
                  <div className="text-[12px] text-muted">{a.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.role === "superadmin" ? "brand" : "default"}>{ROLE_LABEL[a.role]}</Badge>
                  {a.clientId && <Badge>{getClient(a.clientId)?.shortName ?? a.clientId}</Badge>}
                  {athleteName(a.clientId, a.athleteId) && <Badge>{athleteName(a.clientId, a.athleteId)}</Badge>}
                </div>
                {a.id !== me.id ? (
                  <form action={deleteAccount}>
                    <input type="hidden" name="userId" value={a.id} />
                    <button type="submit" title="Elimina account" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-2 transition-colors hover:border-red-200 hover:text-red-600">
                      <span className="text-[13px]">✕</span>
                    </button>
                  </form>
                ) : (
                  <span className="text-[11px] font-medium text-muted-2">tu</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
