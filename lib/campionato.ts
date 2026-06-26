// ============================================================================
// Campionato — dati live (classifica, risultati, prossime partite).
// Fonte: football-data.org (API ufficiale, free tier per Serie A).
// L'integrazione è REALE: serve una chiave gratuita in FOOTBALL_DATA_API_KEY.
// Senza chiave la sezione mostra le istruzioni di configurazione (nessun dato
// inventato). Vedi nota in fondo per la scelta tecnica vs scraping di diretta.it.
// ============================================================================

import { LEAGUE, isLeagueSupported } from "./leagues";

export { isLeagueSupported };

const BASE = "https://api.football-data.org/v4";

export interface StandingRow {
  position: number;
  teamId: number;
  team: string;
  crest: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  form: string | null; // es. "W,D,L,W,W"
}

export interface MatchRow {
  id: number;
  utcDate: string;
  competition: string;
  homeTeam: string;
  homeCrest: string;
  awayTeam: string;
  awayCrest: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export type CampionatoData =
  | { state: "unsupported" }
  | { state: "no-key" }
  | { state: "restricted"; competitionName: string }
  | { state: "error"; status?: number }
  | {
      state: "ok";
      competitionName: string;
      season: string;
      table: StandingRow[];
      teamId: number | null;
      finished: MatchRow[];
      scheduled: MatchRow[];
    };

// ----------------------------------------------------------------------------
// Fetcher robusto: cache in-memory (5 min) + retry sui 429 (rate limit free tier)
// + fallback all'ULTIMO DATO VALIDO. Obiettivo: la sezione del Torino non deve
// MAI mostrare un errore se almeno una volta i dati sono arrivati. Non usiamo la
// data-cache di Next (cache:'no-store') perché cacherebbe anche le risposte non-ok
// (es. un 429 transitorio resterebbe "incollato" per minuti).
// ----------------------------------------------------------------------------
const TTL = 5 * 60 * 1000;
type CacheEntry = { at: number; data: unknown };
const memCache = new Map<string, CacheEntry>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FetchResult = { ok: true; data: unknown } | { ok: false; status?: number };

async function fetchJson(url: string, key: string): Promise<FetchResult> {
  const cached = memCache.get(url);
  if (cached && Date.now() - cached.at < TTL) return { ok: true, data: cached.data };

  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { "X-Auth-Token": key }, cache: "no-store" });
    } catch {
      if (attempt < 2) { await sleep(800); continue; }
      break;
    }
    if (res.ok) {
      const data = await res.json();
      memCache.set(url, { at: Date.now(), data });
      return { ok: true, data };
    }
    // 403/404 ecc. sono stabili: inutile ritentare.
    if (res.status !== 429) return { ok: false, status: res.status };
    if (attempt < 2) await sleep(1200 * (attempt + 1)); // backoff sul rate limit
  }
  // Esauriti i tentativi: se abbiamo un dato (anche oltre il TTL) lo serviamo.
  if (cached) return { ok: true, data: cached.data };
  return { ok: false, status: 429 };
}

function mapMatch(m: Record<string, any>): MatchRow {
  return {
    id: m.id,
    utcDate: m.utcDate,
    competition: m.competition?.name ?? "",
    homeTeam: m.homeTeam?.shortName ?? m.homeTeam?.name ?? "—",
    homeCrest: m.homeTeam?.crest ?? "",
    awayTeam: m.awayTeam?.shortName ?? m.awayTeam?.name ?? "—",
    awayCrest: m.awayTeam?.crest ?? "",
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    status: m.status,
  };
}

export async function getCampionato(clientId: string): Promise<CampionatoData> {
  const cfg = LEAGUE[clientId];
  if (!cfg) return { state: "unsupported" };
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return { state: "no-key" };

  try {
    const standings = await fetchJson(`${BASE}/competitions/${cfg.competition}/standings`, key);
    // 403 = competizione non inclusa nel piano (es. Serie B nel free tier).
    if (!standings.ok && standings.status === 403) return { state: "restricted", competitionName: cfg.competitionName };
    if (!standings.ok) return { state: "error", status: standings.status };
    const data = standings.data as Record<string, any>;

    const total = (data.standings ?? []).find((s: Record<string, any>) => s.type === "TOTAL");
    const table: StandingRow[] = (total?.table ?? []).map((r: Record<string, any>) => ({
      position: r.position,
      teamId: r.team?.id,
      team: r.team?.shortName ?? r.team?.name ?? "—",
      crest: r.team?.crest ?? "",
      played: r.playedGames,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      points: r.points,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDiff: r.goalDifference,
      form: r.form ?? null,
    }));

    const teamRow = table.find((r) => r.team.toLowerCase().includes(cfg.team.toLowerCase()));
    const teamId = teamRow?.teamId ?? null;

    let finished: MatchRow[] = [];
    let scheduled: MatchRow[] = [];
    if (teamId) {
      const [fin, sch] = await Promise.all([
        fetchJson(`${BASE}/teams/${teamId}/matches?status=FINISHED`, key),
        fetchJson(`${BASE}/teams/${teamId}/matches?status=SCHEDULED`, key),
      ]);
      if (fin.ok) {
        const fj = fin.data as Record<string, any>;
        finished = (fj.matches ?? []).map(mapMatch).slice(-5).reverse();
      }
      if (sch.ok) {
        const sj = sch.data as Record<string, any>;
        scheduled = (sj.matches ?? []).map(mapMatch).slice(0, 3);
      }
    }

    return {
      state: "ok",
      competitionName: data.competition?.name ?? "Campionato",
      season: data.season ? `${(data.season.startDate ?? "").slice(0, 4)}/${(data.season.endDate ?? "").slice(0, 4)}` : "",
      table,
      teamId,
      finished,
      scheduled,
    };
  } catch {
    return { state: "error" };
  }
}

// ----------------------------------------------------------------------------
// Nota tecnica — perché football-data.org e non scraping di diretta.it:
// diretta.it (Flashscore) è renderizzato in JS, ha protezioni anti-bot e i ToS
// vietano lo scraping: un collegamento del genere sarebbe fragile e a rischio
// blocco. Un'API ufficiale è la via "attendibile e sicura". In alternativa,
// per dati più ricchi: API-Football (RapidAPI) o Sportmonks.
// ----------------------------------------------------------------------------
