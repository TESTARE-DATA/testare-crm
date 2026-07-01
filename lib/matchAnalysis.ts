import { CLIENTS } from "@/lib/clients";

// ============================================================================
// Match Analysis — statistiche di SQUADRA dalle partite (ottica match analyst).
// Dati mock DETERMINISTICI (seed = hash del clientId) come il resto dell'app:
// niente Math.random a runtime, così server e client combaciano. Diventeranno
// import da un provider (Wyscout/Opta/StatsBomb) mantenendo la stessa forma.
// ============================================================================

export interface MatchStat {
  id: string;
  date: string; // ISO
  opponent: string;
  venue: "casa" | "trasferta";
  gf: number;
  ga: number;
  // Possesso & costruzione
  possession: number; // %
  passes: number;
  passAccuracy: number; // %
  finalThirdPasses: number;
  crosses: number;
  crossesCompleted: number;
  // Finalizzazione
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
  // Duelli & gioco aereo
  aerialDuels: number;
  aerialWon: number;
  groundDuels: number;
  groundWon: number;
  headedGoals: number;
  // Fase difensiva & pressing
  tackles: number;
  interceptions: number;
  clearances: number;
  ppda: number; // passaggi avversari per azione difensiva (pressing: più basso = più aggressivo)
  xga: number;
  // Palle inattive
  corners: number;
  cornersAgainst: number;
  setPieceGoals: number;
  // Disciplina
  fouls: number;
  offsides: number;
}

export interface SeasonAgg {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  gf: number;
  ga: number;
  form: ("V" | "N" | "P")[]; // ultime 5 (più recente prima)
  avg: {
    possession: number; passAccuracy: number; passes: number; finalThirdPasses: number;
    crosses: number; crossAccuracy: number; shots: number; shotsOnTarget: number;
    shotAccuracy: number; xg: number; bigChances: number;
    aerialWinPct: number; groundWinPct: number; aerialWon: number;
    tackles: number; interceptions: number; clearances: number; ppda: number; xga: number;
    corners: number; cornersAgainst: number; fouls: number; offsides: number;
  };
  total: { headedGoals: number; setPieceGoals: number; aerialDuels: number; aerialWon: number };
}

/** Media di lega (benchmark statico) per contestualizzare i valori squadra. */
export const LEAGUE_BENCH = {
  possession: 50, passAccuracy: 82, shots: 12.5, shotsOnTarget: 4.3, xg: 1.35,
  aerialWinPct: 50, groundWinPct: 50, ppda: 11.5, crossAccuracy: 24, corners: 5,
};

const OPPONENTS = [
  "Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio", "Atalanta", "Fiorentina",
  "Bologna", "Torino", "Udinese", "Monza", "Genoa", "Lecce", "Cagliari", "Verona",
  "Empoli", "Sassuolo", "Parma", "Como",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLAYED = 14;
const BASE = Date.parse("2026-06-15");

export function getMatchStats(clientId: string): MatchStat[] {
  const rand = rng(hash("match:" + clientId));
  const ri = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const rf = (min: number, max: number, d = 2) => Number((min + rand() * (max - min)).toFixed(d));

  const own = CLIENTS.find((c) => c.id === clientId)?.name ?? "";
  const pool = OPPONENTS.filter((o) => !own.toLowerCase().includes(o.toLowerCase()));
  // mescola gli avversari in modo deterministico
  const shuffled = [...pool].sort(() => rand() - 0.5);

  const matches: MatchStat[] = [];
  for (let i = 0; i < PLAYED; i++) {
    const shots = ri(7, 19);
    const shotsOnTarget = Math.max(1, Math.round(shots * (0.28 + rand() * 0.22)));
    const xg = Number(Math.max(0.4, shots * 0.09 + rand() * 0.7).toFixed(2));
    const aerialDuels = ri(28, 56);
    const aerialWon = Math.round(aerialDuels * (0.4 + rand() * 0.22));
    const groundDuels = ri(58, 104);
    const groundWon = Math.round(groundDuels * (0.43 + rand() * 0.14));
    const crosses = ri(8, 26);
    const crossesCompleted = Math.round(crosses * (0.18 + rand() * 0.18));
    const gf = Math.max(0, Math.min(5, Math.round(xg + (rand() - 0.45) * 1.8)));
    const ga = ri(0, 3);
    const headedGoals = gf > 0 && rand() > 0.62 ? Math.min(gf, 1 + (rand() > 0.85 ? 1 : 0)) : 0;
    const setPieceGoals = gf > 0 && rand() > 0.6 ? 1 : 0;

    matches.push({
      id: `${clientId}-ma-${i + 1}`,
      date: new Date(BASE - (PLAYED - i) * 7 * 86400000).toISOString().slice(0, 10),
      opponent: shuffled[i % shuffled.length],
      venue: i % 2 === 0 ? "casa" : "trasferta",
      gf, ga,
      possession: ri(41, 63),
      passes: ri(320, 580),
      passAccuracy: ri(76, 89),
      finalThirdPasses: ri(45, 120),
      crosses, crossesCompleted,
      shots, shotsOnTarget, xg, bigChances: ri(0, 5),
      aerialDuels, aerialWon, groundDuels, groundWon, headedGoals,
      tackles: ri(12, 26), interceptions: ri(6, 18), clearances: ri(12, 32),
      ppda: rf(6.5, 16.5, 1), xga: rf(0.5, 2.3, 2),
      corners: ri(3, 10), cornersAgainst: ri(2, 8), setPieceGoals,
      fouls: ri(8, 17), offsides: ri(0, 5),
    });
  }
  return matches;
}

export function aggregate(matches: MatchStat[]): SeasonAgg {
  const n = matches.length || 1;
  const sum = (f: (m: MatchStat) => number) => matches.reduce((s, m) => s + f(m), 0);
  const avg = (f: (m: MatchStat) => number, d = 1) => Number((sum(f) / n).toFixed(d));

  const won = matches.filter((m) => m.gf > m.ga).length;
  const drawn = matches.filter((m) => m.gf === m.ga).length;
  const lost = matches.filter((m) => m.gf < m.ga).length;
  const form = matches.slice(-5).reverse().map((m) => (m.gf > m.ga ? "V" : m.gf === m.ga ? "N" : "P") as "V" | "N" | "P");

  const aerialDuels = sum((m) => m.aerialDuels);
  const aerialWon = sum((m) => m.aerialWon);
  const groundDuels = sum((m) => m.groundDuels);
  const groundWon = sum((m) => m.groundWon);
  const crosses = sum((m) => m.crosses);
  const crossesCompleted = sum((m) => m.crossesCompleted);
  const shots = sum((m) => m.shots);
  const shotsOnTarget = sum((m) => m.shotsOnTarget);

  return {
    played: matches.length,
    won, drawn, lost,
    points: won * 3 + drawn,
    gf: sum((m) => m.gf), ga: sum((m) => m.ga),
    form,
    avg: {
      possession: avg((m) => m.possession),
      passAccuracy: avg((m) => m.passAccuracy),
      passes: avg((m) => m.passes, 0),
      finalThirdPasses: avg((m) => m.finalThirdPasses, 0),
      crosses: avg((m) => m.crosses, 0),
      crossAccuracy: Math.round((crossesCompleted / Math.max(1, crosses)) * 100),
      shots: avg((m) => m.shots),
      shotsOnTarget: avg((m) => m.shotsOnTarget),
      shotAccuracy: Math.round((shotsOnTarget / Math.max(1, shots)) * 100),
      xg: avg((m) => m.xg, 2),
      bigChances: avg((m) => m.bigChances),
      aerialWinPct: Math.round((aerialWon / Math.max(1, aerialDuels)) * 100),
      groundWinPct: Math.round((groundWon / Math.max(1, groundDuels)) * 100),
      aerialWon: avg((m) => m.aerialWon, 0),
      tackles: avg((m) => m.tackles),
      interceptions: avg((m) => m.interceptions),
      clearances: avg((m) => m.clearances),
      ppda: avg((m) => m.ppda, 1),
      xga: avg((m) => m.xga, 2),
      corners: avg((m) => m.corners),
      cornersAgainst: avg((m) => m.cornersAgainst),
      fouls: avg((m) => m.fouls),
      offsides: avg((m) => m.offsides),
    },
    total: {
      headedGoals: sum((m) => m.headedGoals),
      setPieceGoals: sum((m) => m.setPieceGoals),
      aerialDuels, aerialWon,
    },
  };
}

export function getMatchAnalysis(clientId: string): { matches: MatchStat[]; season: SeasonAgg } {
  const matches = getMatchStats(clientId);
  return { matches, season: aggregate(matches) };
}
