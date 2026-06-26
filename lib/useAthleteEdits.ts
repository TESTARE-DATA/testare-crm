"use client";

import { useCallback, useEffect, useState } from "react";
import type { Athlete } from "./types";
import { dbRead, dbUpsert, dbRemove } from "@/lib/db/actions";

// ============================================================================
// Modifiche e rimozioni degli atleti SEED (rosa ufficiale), persistite su DB.
// - overrides: athleteId → campi modificati (collezione "athlete-overrides:<c>")
// - hidden: atleti rimossi dalla rosa (collezione "athlete-hidden:<c>")
// Gli atleti CREATI dall'utente vivono in "athletes:<clientId>" (useDbCollection).
// Interfaccia invariata, così i consumer (useRoster, RosaClient, AthleteHeader,
// flow medica…) restano identici.
// ============================================================================

export type AthletePatch = Partial<Athlete>;
type Overrides = Record<string, AthletePatch>;
type OverrideRow = { id: string; patch: AthletePatch };
type HiddenRow = { id: string };

export function useAthleteEdits(clientId: string) {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const oKey = `athlete-overrides:${clientId}`;
  const hKey = `athlete-hidden:${clientId}`;

  useEffect(() => {
    let alive = true;
    setReady(false);
    Promise.all([dbRead<OverrideRow>(oKey), dbRead<HiddenRow>(hKey)])
      .then(([oRows, hRows]) => {
        if (!alive) return;
        setOverrides(Object.fromEntries(oRows.map((r) => [r.id, r.patch])));
        setHidden(hRows.map((r) => r.id));
        setReady(true);
      })
      .catch(() => { if (alive) { setOverrides({}); setHidden([]); setReady(true); } });
    return () => { alive = false; };
  }, [oKey, hKey]);

  const setOverride = useCallback((id: string, patch: AthletePatch) => {
    const merged = { ...overrides[id], ...patch };
    setOverrides((cur) => ({ ...cur, [id]: merged }));
    dbUpsert(oKey, { id, patch: merged }).catch(() => {});
  }, [oKey, overrides]);

  const hide = useCallback((id: string) => {
    setHidden((cur) => (cur.includes(id) ? cur : [...cur, id]));
    dbUpsert(hKey, { id }).catch(() => {});
  }, [hKey]);

  const restore = useCallback((id: string) => {
    setHidden((cur) => cur.filter((x) => x !== id));
    dbRemove(hKey, id).catch(() => {});
  }, [hKey]);

  /** Applica gli override a un atleta seed. */
  const apply = useCallback((a: Athlete): Athlete => ({ ...a, ...overrides[a.id] }), [overrides]);

  return { overrides, hidden, ready, setOverride, hide, restore, apply };
}
