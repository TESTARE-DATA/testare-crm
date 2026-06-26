"use client";

import { useEffect, useState } from "react";
import type { Athlete } from "./types";
import { dbRead } from "@/lib/db/actions";

// ============================================================================
// Rose EFFETTIVE di TUTTI i clienti per la dashboard globale, risolte dal DB:
// seed − rimossi + correzioni + aggiunti. Carica in async le collezioni di ogni
// cliente; finché non sono pronte mostra i seed (nessun flash bloccante).
// ============================================================================

type OverrideRow = { id: string; patch: Partial<Athlete> };

export function useRostersByClient(seeds: Record<string, Athlete[]>) {
  const [rosters, setRosters] = useState<Record<string, Athlete[]>>(seeds);
  const clientKey = Object.keys(seeds).sort().join(",");

  useEffect(() => {
    let alive = true;
    (async () => {
      const next: Record<string, Athlete[]> = {};
      for (const id of Object.keys(seeds)) {
        try {
          const [local, hiddenRows, overrideRows] = await Promise.all([
            dbRead<Athlete>(`athletes:${id}`),
            dbRead<{ id: string }>(`athlete-hidden:${id}`),
            dbRead<OverrideRow>(`athlete-overrides:${id}`),
          ]);
          const hidden = new Set(hiddenRows.map((r) => r.id));
          const ov = Object.fromEntries(overrideRows.map((r) => [r.id, r.patch]));
          next[id] = [
            ...seeds[id].filter((a) => !hidden.has(a.id)).map((a) => ({ ...a, ...ov[a.id] })),
            ...local,
          ].sort((a, b) => a.shirtNumber - b.shirtNumber);
        } catch {
          next[id] = seeds[id];
        }
      }
      if (alive) setRosters(next);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey]);

  return rosters;
}
