import { NextResponse } from "next/server";
import { isSupabaseConfigured, getAdminClient } from "@/lib/supabase/admin";

// Health check: verifica che il server raggiunga Supabase (usato per conferma
// post-deploy e monitoraggio). Non espone dati: solo lo stato della connessione.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, db: "not_configured" }, { status: 503 });
  }
  try {
    const sb = getAdminClient();
    const { error } = await sb.from("collections").select("coll", { count: "exact", head: true });
    if (error) return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
    return NextResponse.json({ ok: true, db: "connected" });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
  }
}
