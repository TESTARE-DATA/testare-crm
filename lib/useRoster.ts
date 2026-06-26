"use client";

import { useDbCollection } from "./useDbCollection";
import { useAthleteEdits } from "./useAthleteEdits";
import type { Athlete } from "./types";

// ============================================================================
// Rosa EFFETTIVA del cliente, risolta lato client: dati seed + correzioni
// (override) − atleti rimossi (hidden) + atleti aggiunti dall'utente.
// Usata ovunque servano conteggi/statistiche coerenti con le modifiche fatte
// nella sezione Rosa, così "tutta l'app si parla".
// ============================================================================

export function useRoster(clientId: string, seed: Athlete[]) {
  const { items: local } = useDbCollection<Athlete>(`athletes:${clientId}`);
  const { hidden, apply, ready } = useAthleteEdits(clientId);

  const athletes = [
    ...seed.filter((a) => !hidden.includes(a.id)).map(apply),
    ...local,
  ].sort((a, b) => a.shirtNumber - b.shirtNumber);

  return { athletes, ready };
}
