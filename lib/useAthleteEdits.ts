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

// Cache di sessione (come in useDbCollection): le correzioni di stato (es. atleta
// "in valutazione" inviato alla medica) restano disponibili istantanee navigando
// tra le pagine, senza il "lampo" in cui gli atleti tornano tutti disponibili
// finché la lettura dal DB non completa.
const oCache = new Map<string, Overrides>();
const hCache = new Map<string, string[]>();

export function useAthleteEdits(clientId: string) {
  const oKey = `athlete-overrides:${clientId}`;
  const hKey = `athlete-hidden:${clientId}`;
  const [overrides, setOverrides] = useState<Overrides>(() => oCache.get(oKey) ?? {});
  const [hidden, setHidden] = useState<string[]>(() => hCache.get(hKey) ?? []);
  const [ready, setReady] = useState(() => oCache.has(oKey) && hCache.has(hKey));

  useEffect(() => {
    let alive = true;
    // Mostra subito l'eventuale valore in cache, poi riallinea col DB.
    setOverrides(oCache.get(oKey) ?? {});
    setHidden(hCache.get(hKey) ?? []);
    setReady(oCache.has(oKey) && hCache.has(hKey));
    Promise.all([dbRead<OverrideRow>(oKey), dbRead<HiddenRow>(hKey)])
      .then(([oRows, hRows]) => {
        if (!alive) return;
        const o = Object.fromEntries(oRows.map((r) => [r.id, r.patch]));
        const h = hRows.map((r) => r.id);
        oCache.set(oKey, o); hCache.set(hKey, h);
        setOverrides(o); setHidden(h); setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [oKey, hKey]);

  const setOverride = useCallback((id: string, patch: AthletePatch) => {
    let merged: AthletePatch = patch;
    setOverrides((cur) => {
      merged = { ...cur[id], ...patch };
      const next = { ...cur, [id]: merged };
      oCache.set(oKey, next);
      return next;
    });
    dbUpsert(oKey, { id, patch: merged }).catch(() => {});
  }, [oKey]);

  const hide = useCallback((id: string) => {
    setHidden((cur) => {
      if (cur.includes(id)) return cur;
      const next = [...cur, id];
      hCache.set(hKey, next);
      return next;
    });
    dbUpsert(hKey, { id }).catch(() => {});
  }, [hKey]);

  const restore = useCallback((id: string) => {
    setHidden((cur) => {
      const next = cur.filter((x) => x !== id);
      hCache.set(hKey, next);
      return next;
    });
    dbRemove(hKey, id).catch(() => {});
  }, [hKey]);

  /** Applica gli override a un atleta seed. */
  const apply = useCallback((a: Athlete): Athlete => ({ ...a, ...overrides[a.id] }), [overrides]);

  return { overrides, hidden, ready, setOverride, hide, restore, apply };
}
