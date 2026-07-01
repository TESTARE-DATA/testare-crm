import type { Athlete, TestKpi, AthleteTestSession } from "@/lib/types";

// ============================================================================
// Profilo di un atleta ricavato DAI REPORT importati (collezione athlete-tests).
// Tutta la sezione Test → Area Performance (Panoramica, Ranking, Evoluzione) si
// basa su questi dati, non sul profilo mock della rosa. Nell'import il campo
// `kpi` è valorizzato SOLO sulla sessione "corrente" di ogni report → gli
// snapshot con pIndex sono le valutazioni comparabili nel tempo.
// Modulo puro (no "use client"): usato sia lato server (hub) sia client.
// ============================================================================

export interface TestProfile {
  athlete: Athlete;
  cur: TestKpi;          // valutazione più recente (snapshot con pIndex)
  curDate: string;
  prev: TestKpi | null;  // valutazione precedente (per l'evoluzione)
  prevDate: string | null;
  totalSessions: number; // n. sessioni totali in archivio per l'atleta
}

export function buildTestProfiles(athletes: Athlete[], sessions: AthleteTestSession[]): TestProfile[] {
  const rosterById = new Map(athletes.map((a) => [a.id, a] as const));
  const byAth = new Map<string, AthleteTestSession[]>();
  for (const s of sessions) {
    const list = byAth.get(s.athleteId);
    if (list) list.push(s);
    else byAth.set(s.athleteId, [s]);
  }
  const out: TestProfile[] = [];
  for (const [aid, list] of byAth) {
    const a = rosterById.get(aid);
    if (!a) continue; // sessione senza atleta in rosa → non mostrabile
    const snaps = list.filter((s) => s.kpi && s.kpi.pIndex != null).sort((x, y) => y.date.localeCompare(x.date));
    if (!snaps.length) continue; // nessuno snapshot valutabile
    out.push({
      athlete: a,
      cur: snaps[0].kpi as TestKpi,
      curDate: snaps[0].date,
      prev: (snaps[1]?.kpi as TestKpi) ?? null,
      prevDate: snaps[1]?.date ?? null,
      totalSessions: list.length,
    });
  }
  return out.sort((a, b) => (b.cur.pIndex ?? 0) - (a.cur.pIndex ?? 0));
}
