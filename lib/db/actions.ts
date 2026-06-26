"use server";

import { readCollection, upsertItem, removeItem } from "@/lib/db/collections";

// ============================================================================
// Server action sulle collezioni del DB. Sono il ponte tra i componenti client
// e Supabase: il browser non parla mai col DB direttamente (nessuna secret key
// esposta). Finché non c'è il LOGIN sono aperte; quando aggiungeremo l'auth qui
// andrà il controllo sessione/tenant.
// ============================================================================

export async function dbRead<T = unknown>(key: string): Promise<T[]> {
  return readCollection<T>(key);
}

export async function dbUpsert<T extends { id: string }>(key: string, item: T): Promise<void> {
  await upsertItem(key, item);
}

export async function dbRemove(key: string, id: string): Promise<void> {
  await removeItem(key, id);
}
