import "server-only";

import { readCollection } from "@/lib/db/collections";
import { getAthletes } from "@/lib/data";
import type { Athlete } from "@/lib/types";

// ============================================================================
// Rosa risolta LATO SERVER: seed ufficiale + override − atleti nascosti, già
// pronta al primo render. È la controparte server di useRoster/useAthleteEdits:
// elimina il "flash" in cui gli atleti compaiono prima con lo stato seed (es.
// tutti "disponibili") e solo dopo il roundtrip al DB con quello corretto
// (es. "in valutazione"/blu inviati alla medica). Il client continua a montare
// useRoster per gli aggiornamenti live: riapplica gli stessi override (idempotente).
// ============================================================================

type OverrideRow = { id: string; patch: Partial<Athlete> };
type HiddenRow = { id: string };

export async function getResolvedAthletes(clientId: string): Promise<Athlete[]> {
  const seed = getAthletes(clientId);
  const [oRows, hRows] = await Promise.all([
    readCollection<OverrideRow>(`athlete-overrides:${clientId}`).catch(() => [] as OverrideRow[]),
    readCollection<HiddenRow>(`athlete-hidden:${clientId}`).catch(() => [] as HiddenRow[]),
  ]);
  const overrides = new Map(oRows.map((r) => [r.id, r.patch] as const));
  const hidden = new Set(hRows.map((r) => r.id));
  return seed
    .filter((a) => !hidden.has(a.id))
    .map((a) => ({ ...a, ...overrides.get(a.id) }));
}
