"use client";

import { useCallback, useEffect, useState } from "react";
import { dbRead, dbUpsert, dbRemove } from "@/lib/db/actions";

// ============================================================================
// Drop-in di useLocalCollection ma persistito su Supabase (via server action).
// Stessa identica firma { items, add, remove, update, ready }, così i componenti
// non cambiano logica: continuano a fare [...seedImmutabile, ...items], ma gli
// items (le mutazioni dell'utente) ora sono condivisi nel database.
// Le scritture sono ottimistiche; in caso di errore si riallinea col DB.
// ============================================================================

export function useDbCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    dbRead<T>(key)
      .then((rows) => setItems(rows))
      .catch(() => {});
  }, [key]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    dbRead<T>(key)
      .then((rows) => { if (alive) { setItems(rows); setReady(true); } })
      .catch(() => { if (alive) { setItems([]); setReady(true); } });
    return () => { alive = false; };
  }, [key]);

  const add = useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
    dbUpsert(key, item).catch(refresh);
  }, [key, refresh]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    dbRemove(key, id).catch(refresh);
  }, [key, refresh]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const existing = items.find((i) => i.id === id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (existing) dbUpsert(key, { ...existing, ...patch }).catch(refresh);
  }, [key, items, refresh]);

  return { items, add, remove, update, ready, refresh };
}
