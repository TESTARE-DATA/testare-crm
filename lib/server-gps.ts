import "server-only";

import { readCollection } from "@/lib/db/collections";
import { getGps } from "@/lib/data";
import type { GpsRecord } from "@/lib/types";

// ============================================================================
// GPS/carico risolto LATO SERVER: dati seed + record importati dalla sezione
// "Importa Dati" (collezione DB `gps:<clientId>`). Così i dati caricati dallo
// staff compaiono ovunque si legga il carico (Carico, GPS, Cardio, Data
// Analysis, R&D) senza differenze tra le pagine. Idempotente e fail-safe: se il
// DB non risponde, restituisce solo il seed.
// ============================================================================

export async function getMergedGps(clientId: string): Promise<GpsRecord[]> {
  const seed = getGps(clientId);
  const imported = await readCollection<GpsRecord>(`gps:${clientId}`).catch(() => [] as GpsRecord[]);
  if (imported.length === 0) return seed;
  // Dedup per id (gli import recenti vincono sul seed in caso di stesso id).
  const byId = new Map(seed.map((g) => [g.id, g] as const));
  for (const g of imported) byId.set(g.id, g);
  return [...byId.values()];
}
