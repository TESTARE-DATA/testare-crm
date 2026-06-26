import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Client Supabase con la SECRET key (service_role): accesso pieno lato SERVER,
// bypassa la Row Level Security. Da usare SOLO in Server Component, route
// handler e server action — MAI nel browser (la secret key non deve uscire).
// Finché non c'è il login, tutte le letture/scritture passano da qui.
// ============================================================================

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configurato: mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
