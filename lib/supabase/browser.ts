"use client";
import { createBrowserClient } from "@supabase/ssr";

// Client Supabase lato BROWSER legato alla sessione (cookie). Usa la chiave
// pubblica. Serve nei componenti client per il login e per leggere lo stato auth.
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}
