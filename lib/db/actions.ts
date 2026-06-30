"use server";

import { readCollection, upsertItem, upsertMany, removeItem } from "@/lib/db/collections";

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

/** Inserimento in blocco (import massivo): una sola scrittura per N entità. */
export async function dbUpsertMany<T extends { id: string }>(key: string, items: T[]): Promise<number> {
  return upsertMany(key, items);
}
