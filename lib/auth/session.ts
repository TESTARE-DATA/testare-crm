import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/auth/roles";
import { canAccessClient } from "@/lib/auth/roles";

// ============================================================================
// Data Access Layer dell'autenticazione. Centralizza "chi è l'utente" e "cosa
// può vedere". Va usato vicino ai dati (Server Component, Server Action) — NON
// fidarsi mai dei controlli lato client. `cache()` deduplica le chiamate entro
// una singola render di React.
// ============================================================================

/** Utente auth verificato col server Supabase (getUser valida il JWT, non solo il cookie). */
export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Profilo completo (ruolo + tenant) dell'utente loggato, o null se non loggato. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  // Legge SOLO la propria riga (la RLS "own profile" lo garantisce a livello DB).
  const { data } = await supabase
    .from("profiles")
    .select("id, role, client_id, athlete_id, full_name")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    role: data.role as Role,
    clientId: data.client_id ?? null,
    athleteId: data.athlete_id ?? null,
    fullName: data.full_name ?? null,
    email: user.email ?? null,
  };
});

/** Richiede un utente loggato con profilo; altrimenti → /login. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Richiede il ruolo superadmin; altrimenti → home (nessun accesso). */
export async function requireSuperadmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") redirect("/");
  return profile;
}

/** Richiede che l'utente possa accedere a quella società; altrimenti → home. */
export async function requireClientAccess(clientId: string): Promise<Profile> {
  const profile = await requireProfile();
  if (!canAccessClient(profile, clientId)) redirect("/");
  return profile;
}
