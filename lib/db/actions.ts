"use server";

import { readCollection, upsertItem, upsertMany, removeItem } from "@/lib/db/collections";
import { getProfile } from "@/lib/auth/session";
import type { Profile } from "@/lib/auth/roles";

// ============================================================================
// Server action sulle collezioni del DB. Sono il ponte tra i componenti client
// e Supabase: il browser non parla mai col DB direttamente (nessuna secret key
// esposta). OGNI chiamata verifica la sessione e il tenant: la società a cui
// l'utente può accedere viene dalla SESSIONE (profilo), mai dal chiamante.
//  - superadmin : tutte le collezioni;
//  - staff      : collezioni globali + quelle della PROPRIA società;
//  - athlete    : nessun accesso diretto (la Vista Atleta è resa lato server).
// ============================================================================

/** Società della chiave ("medical:torino" → "torino"); null per le globali. */
function clientOfKey(key: string): string | null {
  const i = key.indexOf(":");
  return i === -1 ? null : key.slice(i + 1) || null;
}

async function authorize(key: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) throw new Error("Non autenticato: accesso negato.");
  if (profile.role === "superadmin") return profile;
  if (profile.role === "staff") {
    const keyClient = clientOfKey(key);
    // Chiavi globali (senza società) o della propria società: ok. Altre: no.
    if (keyClient === null || keyClient === profile.clientId) return profile;
    throw new Error("Accesso negato: collezione di un'altra società.");
  }
  // athlete (o ruoli futuri): nessun accesso diretto alle collezioni.
  throw new Error("Accesso negato.");
}

export async function dbRead<T = unknown>(key: string): Promise<T[]> {
  await authorize(key);
  return readCollection<T>(key);
}

export async function dbUpsert<T extends { id: string }>(key: string, item: T): Promise<void> {
  await authorize(key);
  await upsertItem(key, item);
}

export async function dbRemove(key: string, id: string): Promise<void> {
  await authorize(key);
  await removeItem(key, id);
}

/** Inserimento in blocco (import massivo): una sola scrittura per N entità. */
export async function dbUpsertMany<T extends { id: string }>(key: string, items: T[]): Promise<number> {
  await authorize(key);
  return upsertMany(key, items);
}
