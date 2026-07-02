import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ============================================================================
// Client Supabase lato SERVER legato alla SESSIONE dell'utente (cookie).
// Usa la chiave PUBBLICA (anon/publishable) + i cookie di auth: rispetta la Row
// Level Security e rappresenta "chi sta navigando". Da usare in Server Component,
// Server Action e Route Handler per leggere l'utente loggato e il suo profilo.
// NB: diverso da getAdminClient() (service_role) che bypassa la RLS ed è solo
// per operazioni amministrative controllate.
// ============================================================================

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configurato: mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In un Server Component i cookie sono read-only: l'errore è atteso e
        // innocuo (il refresh della sessione lo fa il proxy). Nelle Server Action
        // e nei Route Handler invece la scrittura va a buon fine.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* chiamato da un Server Component: ignora */
        }
      },
    },
  });
}
