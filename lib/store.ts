"use client";

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Store locale (localStorage) per le entità CREATE dall'utente nella UI.
// I dati seed restano server-side; qui salviamo solo le aggiunte, così le
// funzionalità "crea" funzionano davvero. Quando colleghiamo un DB, queste
// scritture diventeranno chiamate API mantenendo la stessa interfaccia.
// ============================================================================

const PREFIX = "testare-crm";
const SYNC_EVENT = "testare-local-collection";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Hook tipo useState persistito in localStorage, sincronizzato tra tab. */
export function useLocalCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read<T[]>(key, []));
    setReady(true);
    const refresh = () => setItems(read<T[]>(key, []));
    const onStorage = (e: StorageEvent) => { if (e.key === `${PREFIX}:${key}`) refresh(); }; // altre tab
    const onSync = (e: Event) => { if ((e as CustomEvent).detail === key) refresh(); }; // stessa pagina
    window.addEventListener("storage", onStorage);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(SYNC_EVENT, onSync); };
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      try {
        window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
      } catch {
        /* quota */
      }
    },
    [key],
  );

  const add = useCallback((item: T) => persist([...read<T[]>(key, []), item]), [key, persist]);
  const remove = useCallback((id: string) => persist(read<T[]>(key, []).filter((i) => i.id !== id)), [key, persist]);
  const update = useCallback((id: string, patch: Partial<T>) => persist(read<T[]>(key, []).map((i) => (i.id === id ? { ...i, ...patch } : i))), [key, persist]);

  return { items, add, remove, update, ready };
}

export function newId(prefix: string) {
  // Entropia reale: chiamate multiple nello STESSO tick (es. più esercizi creati
  // insieme nel builder) devono restare uniche, altrimenti l'upsert per id le
  // sovrascrive a vicenda (onConflict "coll,id") con perdita silenziosa di dati.
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}
