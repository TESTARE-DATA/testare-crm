"use client";

import { useActionState, useState } from "react";
import { createAccount, type AdminActionState } from "./actions";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";

export interface ClientOption { id: string; name: string }
export interface AthleteOption { id: string; name: string }

export function CreateAccountForm({ clients, athletesByClient }: {
  clients: ClientOption[];
  athletesByClient: Record<string, AthleteOption[]>;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createAccount, undefined);
  const [role, setRole] = useState<Role>("staff");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const athletes = athletesByClient[clientId] ?? [];

  return (
    <form action={action} className="space-y-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Nome e cognome</span>
          <input name="fullName" className="inp" placeholder="Mario Rossi" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Email</span>
          <input name="email" type="email" required className="inp" placeholder="nome@societa.it" autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Password iniziale</span>
          <input name="password" type="text" required minLength={8} className="inp" placeholder="Minimo 8 caratteri" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Ruolo</span>
          <select name="role" className="inp" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="staff">{ROLE_LABEL.staff}</option>
            <option value="athlete">{ROLE_LABEL.athlete}</option>
            <option value="superadmin">{ROLE_LABEL.superadmin}</option>
          </select>
        </label>
      </div>

      {role !== "superadmin" && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Società</span>
            <select name="clientId" className="inp" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {role === "athlete" && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Atleta</span>
              <select name="athleteId" className="inp" defaultValue="">
                <option value="" disabled>Seleziona…</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700" role="alert">{state.error}</p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700" role="status">
          {state.ok} — comunica email e password alla persona; potrà cambiarla in seguito.
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
        {pending ? "Creazione…" : "Crea account"}
      </button>
    </form>
  );
}
