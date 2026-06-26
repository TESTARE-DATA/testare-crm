import type { PlayerRole } from "./types";

// ============================================================================
// Rose ufficiali 2025/26 (Torino FC · Empoli FC).
// Per i giocatori dell'Empoli profilati nel Season Report TESTÀRE (13/05/26)
// sono presenti le KPI reali (percentili) e il P-Index della sessione precedente.
// ============================================================================

export interface RosterKpi {
  forza: number;
  potenza: number;
  reattivita: number;
  simmetria: number;
  pIndex: number;
  /** P-Index sessione precedente (dal report), se disponibile. */
  prevPIndex?: number;
}

export interface RosterPlayer {
  num: number;
  first: string;
  last: string;
  role: PlayerRole;
  nat: string;
  /** Data di nascita reale (ISO). Anagrafica autentica, non generata. */
  birth?: string;
  /** Cresciuto nel settore giovanile/vivaio della società. */
  fromYouth?: boolean;
  kpi?: RosterKpi;
}

const IT = "🇮🇹 Italia";

export const ROSTERS: Record<string, RosterPlayer[]> = {
  torino: [
    { num: 1, first: "Alberto", last: "Paleari", role: "Portiere", nat: IT, birth: "1992-08-29" },
    { num: 81, first: "Franco", last: "Israel", role: "Portiere", nat: "🇺🇾 Uruguay", birth: "2000-04-22" },
    { num: 16, first: "Marcus", last: "Holmgren Pedersen", role: "Difensore", nat: "🇳🇴 Norvegia", birth: "2000-07-16" },
    { num: 23, first: "Saúl", last: "Coco", role: "Difensore", nat: "🇬🇶 Guinea Eq.", birth: "1999-02-09" },
    { num: 34, first: "Cristiano", last: "Biraghi", role: "Difensore", nat: IT, birth: "1992-09-01" },
    { num: 35, first: "Luca", last: "Marianucci", role: "Difensore", nat: IT, birth: "2004-07-23" },
    { num: 44, first: "Ardian", last: "Ismajli", role: "Difensore", nat: "🇦🇱 Albania", birth: "1996-09-30" },
    { num: 77, first: "Enzo", last: "Ebosse", role: "Difensore", nat: "🇨🇲 Camerun", birth: "1999-03-11" },
    { num: 4, first: "Matteo", last: "Prati", role: "Centrocampista", nat: IT, birth: "2003-12-28" },
    { num: 6, first: "Emirhan", last: "İlkhan", role: "Centrocampista", nat: "🇹🇷 Turchia", birth: "2004-06-01" },
    { num: 8, first: "Ivan", last: "Ilić", role: "Centrocampista", nat: "🇷🇸 Serbia", birth: "2001-03-17" },
    { num: 10, first: "Nikola", last: "Vlašić", role: "Centrocampista", nat: "🇭🇷 Croazia", birth: "1997-10-04" },
    { num: 14, first: "Tino", last: "Anjorin", role: "Centrocampista", nat: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inghilterra", birth: "2001-11-23" },
    { num: 22, first: "Cesare", last: "Casadei", role: "Centrocampista", nat: IT, birth: "2003-01-10" },
    { num: 66, first: "Gvidas", last: "Gineitis", role: "Centrocampista", nat: "🇱🇹 Lituania", birth: "2004-04-15" },
    { num: 83, first: "Sergiu", last: "Perciun", role: "Centrocampista", nat: "🇲🇩 Moldavia", birth: "2006-04-23" },
    { num: 7, first: "Zakaria", last: "Aboukhlal", role: "Attaccante", nat: "🇲🇦 Marocco", birth: "2000-02-18" },
    { num: 17, first: "Sandro", last: "Kulenović", role: "Attaccante", nat: "🇭🇷 Croazia", birth: "1999-12-04" },
    { num: 18, first: "Giovanni", last: "Simeone", role: "Attaccante", nat: "🇦🇷 Argentina", birth: "1995-07-05" },
    { num: 19, first: "Ché", last: "Adams", role: "Attaccante", nat: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scozia", birth: "1996-07-13" },
    { num: 91, first: "Duván", last: "Zapata", role: "Attaccante", nat: "🇨🇴 Colombia", birth: "1991-04-01" },
    { num: 92, first: "Alieu", last: "Njie", role: "Attaccante", nat: "🇸🇪 Svezia", birth: "2005-05-14" },
  ],
  empoli: [
    { num: 1, first: "Samuele", last: "Perisan", role: "Portiere", nat: IT, kpi: { forza: 85, potenza: 89, reattivita: 72, simmetria: 76, pIndex: 82, prevPIndex: 76 } },
    { num: 12, first: "Manuel", last: "Gasparini", role: "Portiere", nat: IT, kpi: { forza: 88, potenza: 60, reattivita: 39, simmetria: 73, pIndex: 62, prevPIndex: 64 } },
    { num: 21, first: "Andrea", last: "Fulignati", role: "Portiere", nat: IT },
    { num: 2, first: "Marco", last: "Curto", role: "Difensore", nat: IT },
    { num: 4, first: "Simone", last: "Romagnoli", role: "Difensore", nat: IT, kpi: { forza: 90, potenza: 83, reattivita: 85, simmetria: 86, pIndex: 86, prevPIndex: 48 } },
    { num: 5, first: "Nosa", last: "Obaretin", role: "Difensore", nat: IT },
    { num: 20, first: "Matteo", last: "Lovato", role: "Difensore", nat: IT },
    { num: 24, first: "Tyronne", last: "Ebuehi", role: "Difensore", nat: "🇳🇬 Nigeria" },
    { num: 26, first: "Antonio", last: "Candela", role: "Difensore", nat: IT },
    { num: 27, first: "Brando", last: "Moruzzi", role: "Difensore", nat: IT },
    { num: 28, first: "Gabriele", last: "Indragoli", role: "Difensore", nat: IT, kpi: { forza: 78, potenza: 66, reattivita: 64, simmetria: 47, pIndex: 69, prevPIndex: 69 } },
    { num: 34, first: "Gabriele", last: "Guarino", role: "Difensore", nat: IT, kpi: { forza: 81, potenza: 44, reattivita: 45, simmetria: 80, pIndex: 57, prevPIndex: 67 } },
    { num: 6, first: "Duccio", last: "Degli Innocenti", role: "Centrocampista", nat: IT },
    { num: 7, first: "Salvatore", last: "Elia", role: "Centrocampista", nat: IT },
    { num: 8, first: "Luca", last: "Magnino", role: "Centrocampista", nat: IT, kpi: { forza: 81, potenza: 50, reattivita: 64, simmetria: 49, pIndex: 65 } },
    { num: 10, first: "Rares", last: "Ilie", role: "Centrocampista", nat: "🇷🇴 Romania" },
    { num: 14, first: "Gerard", last: "Yepes", role: "Centrocampista", nat: "🇪🇸 Spagna", kpi: { forza: 71, potenza: 49, reattivita: 75, simmetria: 52, pIndex: 65, prevPIndex: 69 } },
    { num: 15, first: "Joseph", last: "Ceesay", role: "Centrocampista", nat: "🇸🇪 Svezia" },
    { num: 18, first: "Andrea", last: "Ghion", role: "Centrocampista", nat: IT },
    { num: 25, first: "Lorenzo", last: "Ignacchiti", role: "Centrocampista", nat: IT },
    { num: 32, first: "Nicolas", last: "Haas", role: "Centrocampista", nat: "🇨🇭 Svizzera" },
    { num: 9, first: "Pietro", last: "Pellegri", role: "Attaccante", nat: IT },
    { num: 11, first: "Stiven", last: "Shpendi", role: "Attaccante", nat: "🇦🇱 Albania" },
    { num: 17, first: "Daniel", last: "Fila", role: "Attaccante", nat: "🇨🇿 Rep. Ceca" },
    { num: 19, first: "Marco", last: "Nasti", role: "Attaccante", nat: IT },
    { num: 70, first: "Edoardo", last: "Saporiti", role: "Attaccante", nat: IT, kpi: { forza: 69, potenza: 75, reattivita: 71, simmetria: 78, pIndex: 72, prevPIndex: 72 } },
    { num: 77, first: "Bohdan", last: "Popov", role: "Attaccante", nat: "🇺🇦 Ucraina", kpi: { forza: 77, potenza: 91, reattivita: 63, simmetria: 71, pIndex: 77, prevPIndex: 65 } },
    { num: 99, first: "Flavio", last: "Bianchi", role: "Attaccante", nat: IT, kpi: { forza: 84, potenza: 48, reattivita: 51, simmetria: 82, pIndex: 61 } },
  ],
};
