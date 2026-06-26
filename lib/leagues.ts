// ============================================================================
// Config campionati per cliente (modulo PURO, importabile anche lato client).
// La logica di fetch live sta in lib/campionato.ts.
// ============================================================================

export interface LeagueConfig {
  competition: string; // codice football-data.org (es. "SA" = Serie A)
  team: string; // nome da cercare in classifica
  competitionName: string;
}

// Solo i clienti con campionato ATTIVO. Il free tier di football-data.org copre
// la Serie A ("SA") ma NON la Serie B: per ora l'Empoli (Serie B) resta fuori
// finché non si decide come gestirlo.
export const LEAGUE: Record<string, LeagueConfig> = {
  torino: { competition: "SA", team: "Torino", competitionName: "Serie A" },
};

export function isLeagueSupported(clientId: string): boolean {
  return clientId in LEAGUE;
}
