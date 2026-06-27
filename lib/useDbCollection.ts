"use client";

import { useCallback, useEffect, useState } from "react";
import { dbRead, dbUpsert, dbRemove } from "@/lib/db/actions";

// ============================================================================
// Drop-in di useLocalCollection ma persistito su Supabase (via server action).
// Stessa identica firma { items, add, remove, update, ready }, così i componenti
// non cambiano logica: continuano a fare [...seedImmutabile, ...items], ma gli
// items (le mutazioni dell'utente) ora sono condivisi nel database.
// Le scritture sono ottimistiche; in caso di errore si riallinea col DB.
//
// CACHE: una mappa a livello di modulo conserva l'ultimo valore noto di ogni
// collezione per tutta la sessione SPA. Così, navigando tra pagine (es. Rosa →
// Presa in carico → Diario), la lista compare ISTANTANEA con l'ultimo dato —
// inclusa la segnalazione appena inviata — e si riallinea col DB in sottofondo,
// senza il "lampo" di lista vuota durante il roundtrip.
// ============================================================================

const cache = new Map<string, unknown[]>();

// `initial` (opzionale) = stato già risolto LATO SERVER per la prima resa: evita
// il flash in cui una lista derivata cambia quando le collezioni arrivano dal DB
// (es. la coda della Presa in carico che passa da 4 a 3 quando l'intake con
// "affidato a" viene letto). In hydration combacia con l'HTML del server.
export function useDbCollection<T extends { id: string }>(key: string, initial?: T[]) {
  const [items, setItems] = useState<T[]>(() => (cache.get(key) as T[]) ?? initial ?? []);
  const [ready, setReady] = useState(() => cache.has(key) || initial != null);

  const refresh = useCallback(() => {
    dbRead<T>(key)
      .then((rows) => { cache.set(key, rows); setItems(rows); })
      .catch(() => {});
  }, [key]);

  useEffect(() => {
    let alive = true;
    // Mostra subito l'eventuale valore in cache (o il seed server), poi riallinea col DB.
    setItems((cache.get(key) as T[]) ?? initial ?? []);
    setReady(cache.has(key) || initial != null);
    dbRead<T>(key)
      .then((rows) => {
        if (!alive) return;
        // Fonde col DB ma preserva le aggiunte ottimistiche non ancora atterrate
        // (es. segnalazione inviata dalla Rosa un istante prima di navigare qui).
        const byId = new Map(rows.map((r) => [r.id, r] as const));
        for (const c of (cache.get(key) as T[]) ?? []) if (!byId.has(c.id)) byId.set(c.id, c);
        const merged = [...byId.values()];
        cache.set(key, merged);
        setItems(merged);
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [key]);

  const add = useCallback((item: T) => {
    setItems((prev) => { const next = [...prev, item]; cache.set(key, next); return next; });
    dbUpsert(key, item).catch(refresh);
  }, [key, refresh]);

  const remove = useCallback((id: string) => {
    setItems((prev) => { const next = prev.filter((i) => i.id !== id); cache.set(key, next); return next; });
    dbRemove(key, id).catch(refresh);
  }, [key, refresh]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    let updated: T | undefined;
    setItems((prev) => {
      const next = prev.map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...patch };
        return updated;
      });
      cache.set(key, next);
      return next;
    });
    if (updated) dbUpsert(key, updated).catch(refresh);
  }, [key, refresh]);

  return { items, add, remove, update, ready, refresh };
}
