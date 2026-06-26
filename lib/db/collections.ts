import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// Data layer generico: rispecchia il modello di localStorage (una "collezione"
// = un array di entità con id), ma su Postgres. Una sola tabella `collections`
// ospita TUTTE le collezioni dell'app, indicizzate per chiave (es. "medical:torino").
// Così le ~22 collezioni migrano con UN solo schema + queste poche funzioni,
// mantenendo la stessa interfaccia di useLocalCollection.
//
// La chiave segue il formato "<nome>:<clientId>" (es. "medical:torino"); per le
// collezioni globali è senza ":" (es. "reports"). client_id viene estratto e
// salvato a parte per le future policy RLS multi-tenant.
// ============================================================================

const TABLE = "collections";

function clientIdFromKey(key: string): string | null {
  const i = key.indexOf(":");
  return i === -1 ? null : key.slice(i + 1) || null;
}

/** Tutte le entità di una collezione, in ordine di inserimento. */
export async function readCollection<T = unknown>(key: string): Promise<T[]> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from(TABLE)
    .select("data")
    .eq("coll", key)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => (row as { data: T }).data);
}

/** Inserisce o aggiorna un'entità (per id) nella collezione. */
export async function upsertItem<T extends { id: string }>(key: string, item: T): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.from(TABLE).upsert(
    { coll: key, client_id: clientIdFromKey(key), id: item.id, data: item, updated_at: new Date().toISOString() },
    { onConflict: "coll,id" },
  );
  if (error) throw error;
}

/** Rimuove un'entità per id. */
export async function removeItem(key: string, id: string): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.from(TABLE).delete().eq("coll", key).eq("id", id);
  if (error) throw error;
}

/** Inserimento in blocco (usato dal seed). */
export async function upsertMany<T extends { id: string }>(key: string, items: T[]): Promise<number> {
  if (items.length === 0) return 0;
  const sb = getAdminClient();
  const now = new Date().toISOString();
  const rows = items.map((item) => ({ coll: key, client_id: clientIdFromKey(key), id: item.id, data: item, updated_at: now }));
  const { error } = await sb.from(TABLE).upsert(rows, { onConflict: "coll,id" });
  if (error) throw error;
  return rows.length;
}
