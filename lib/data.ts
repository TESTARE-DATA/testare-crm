import type {
  Athlete,
  CalendarEvent,
  Exercise,
  GpsRecord,
  ImportJob,
  LiveSession,
  MedicalRecord,
  PerfProfile,
  PhysicalKpi,
  RdProject,
  SessionTemplate,
  TestResult,
} from "./types";
import { CLIENTS } from "./clients";
import { ROSTERS, type RosterPlayer } from "./rosters";

// ============================================================================
// Dati mock realistici e COLLEGATI tra loro, generati in modo deterministico.
// Sostituibile con query a un DB mantenendo le stesse funzioni di accesso.
// ============================================================================

function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(daysFromBase: number, base = Date.parse("2026-06-19")): string {
  return new Date(base + daysFromBase * 86400000).toISOString().slice(0, 10);
}

const clamp = (n: number) => Math.max(1, Math.min(100, Math.round(n)));

/** Età (anni interi) di una persona a una certa data. */
function ageOfAt(birthISO: string, atISO: string): number {
  return Math.floor((Date.parse(atISO) - Date.parse(birthISO)) / (365.25 * 86400000));
}

/** Calcola il P-Index composito coerente con la metodologia del report. */
function computePIndex(k: PhysicalKpi): number {
  return clamp(0.3 * k.forza + 0.32 * k.potenza + 0.23 * k.reattivita + 0.15 * k.simmetria);
}

/** Costruisce il profilo performance: KPI reali dal report o generate. */
function buildProfile(p: RosterPlayer, r: () => number): PerfProfile {
  let cur: PhysicalKpi;
  let pIndex: number;
  if (p.kpi) {
    cur = { forza: p.kpi.forza, potenza: p.kpi.potenza, reattivita: p.kpi.reattivita, simmetria: p.kpi.simmetria };
    pIndex = p.kpi.pIndex;
  } else {
    const base = 52 + r() * 34;
    cur = {
      forza: clamp(base + (r() - 0.5) * 26),
      potenza: clamp(base + (r() - 0.5) * 30),
      reattivita: clamp(base + (r() - 0.5) * 30),
      simmetria: clamp(80 + (r() - 0.5) * 34),
    };
    pIndex = computePIndex(cur);
  }

  // Sessione precedente: dal P-Index reale (scalando le dimensioni) o generata.
  let prev: PhysicalKpi & { pIndex: number };
  if (p.kpi?.prevPIndex != null) {
    const ratio = p.kpi.prevPIndex / Math.max(1, pIndex);
    prev = {
      forza: clamp(cur.forza * ratio),
      potenza: clamp(cur.potenza * ratio),
      reattivita: clamp(cur.reattivita * ratio),
      simmetria: clamp(cur.simmetria * ratio),
      pIndex: p.kpi.prevPIndex,
    };
  } else {
    const drift = () => (r() - 0.55) * 14;
    const pv: PhysicalKpi = {
      forza: clamp(cur.forza + drift()),
      potenza: clamp(cur.potenza + drift()),
      reattivita: clamp(cur.reattivita + drift()),
      simmetria: clamp(cur.simmetria + drift()),
    };
    prev = { ...pv, pIndex: computePIndex(pv) };
  }

  return { ...cur, pIndex, prev };
}

function buildAthletes(clientId: string): Athlete[] {
  const roster = ROSTERS[clientId] ?? [];
  return roster.map((p, i) => {
    const r = rng(p.num * 101 + clientId.length * 17 + i);
    const age = 18 + Math.floor(r() * 17);
    // alcuni atleti infortunati/in recupero (deterministico)
    const sr = r();
    const status = sr > 0.9 ? "infortunato" : sr > 0.82 ? "in recupero" : sr > 0.77 ? "a riposo" : "disponibile";
    const joinedAt = iso(-Math.floor(r() * 1400));
    return {
      id: `${clientId}-ath-${String(p.num).padStart(2, "0")}`,
      clientId,
      firstName: p.first,
      lastName: p.last,
      // Data di nascita REALE se presente in rosa, altrimenti generata (placeholder).
      birthDate: p.birth ?? iso(-age * 365 - Math.floor(r() * 365)),
      nationality: p.nat,
      role: p.role,
      shirtNumber: p.num,
      foot: r() > 0.72 ? "Sinistro" : r() > 0.05 ? "Destro" : "Ambidestro",
      status,
      heightCm: (p.role === "Portiere" ? 188 : 174) + Math.floor(r() * 14),
      weightKg: 68 + Math.floor(r() * 18),
      bodyFatPct: Number((7 + r() * 5).toFixed(1)),
      wingspanCm: 178 + Math.floor(r() * 18),
      profile: buildProfile(p, r),
      joinedAt,
      // Settore giovanile: reale se indicato in rosa, altrimenti stima deterministica
      // (chi è arrivato a ≤19 anni rientra plausibilmente dal vivaio).
      fromYouth: p.fromYouth ?? ageOfAt(p.birth ?? iso(-age * 365), joinedAt) <= 19,
    } as Athlete;
  });
}

const ATHLETES: Athlete[] = CLIENTS.flatMap((c) => buildAthletes(c.id));

// ----- Esercizi: TATTICI (campo) + ATLETICI (palestra) -----------------------
type ExSeed = Omit<Exercise, "id" | "clientId">;

const TACTICAL: ExSeed[] = [
  { name: "Rondo 5v2", domain: "tattico", category: "Possesso", description: "Possesso in spazio ridotto, due recuperatori al centro. Ritmo alto e qualità di trasmissione.", durationMin: 12, players: "5 vs 2", equipment: ["Coni", "Palloni"], tags: ["tecnica", "intensità"] },
  { name: "Partita a tema 8v8", domain: "tattico", category: "Partita a tema", description: "Partita con vincoli su numero tocchi e zone di rifinitura.", durationMin: 20, players: "8 vs 8", equipment: ["Casacche", "Porte"], tags: ["tattica", "condizionale"] },
  { name: "Transizione 4v4+jolly", domain: "tattico", category: "Transizioni", description: "Cambi di possesso rapidi con jolly per superiorità. Focus sul primo passaggio dopo recupero.", durationMin: 16, players: "4v4+2", equipment: ["Casacche", "Mini-porte"], tags: ["transizioni", "reattività"] },
  { name: "Finalizzazione 1-2", domain: "tattico", category: "Finalizzazione", description: "Combinazioni in zona rifinitura con conclusione a rete.", durationMin: 16, players: "Reparti", equipment: ["Palloni", "Porte"], tags: ["tecnica", "tiro"] },
  { name: "Costruzione dal basso 11v9", domain: "tattico", category: "Situazionale", description: "Uscita palla contro pressione, attiva la linea difensiva e i mediani.", durationMin: 22, players: "11 vs 9", equipment: ["Casacche", "Porte"], tags: ["costruzione", "pressing"] },
  { name: "Attivazione tecnica a navetta", domain: "tattico", category: "Riscaldamento tecnico", description: "Riscaldamento con palla, passaggi e controlli orientati.", durationMin: 12, players: "Gruppi", equipment: ["Coni", "Palloni"], tags: ["warmup", "tecnica"] },
];

const ATHLETIC: ExSeed[] = [
  { name: "Back Squat", domain: "atletico", category: "Forza", muscleGroups: ["Gambe", "Catena posteriore"], description: "Forza massimale arti inferiori, 4x4 @85% 1RM.", durationMin: 18, equipment: ["Bilanciere", "Rack"], tags: ["forza", "gambe"] },
  { name: "Hip Thrust", domain: "atletico", category: "Forza", muscleGroups: ["Catena posteriore", "Gambe"], description: "Forza glutei e catena posteriore, fondamentale per sprint.", durationMin: 14, equipment: ["Bilanciere", "Panca"], tags: ["forza", "glutei"] },
  { name: "Panca piana", domain: "atletico", category: "Forza", muscleGroups: ["Petto", "Spalle", "Braccia"], description: "Forza parte superiore, contrasto e duelli.", durationMin: 14, equipment: ["Bilanciere", "Panca"], tags: ["forza", "petto"] },
  { name: "Countermovement Jump training", domain: "atletico", category: "Potenza", muscleGroups: ["Gambe"], description: "Sviluppo potenza esplosiva arti inferiori.", durationMin: 12, equipment: ["Pedana", "Box"], tags: ["potenza", "salto"] },
  { name: "Sprint 30m resistito", domain: "atletico", category: "Sprint", muscleGroups: ["Gambe", "Catena posteriore"], description: "Sprint con traino per accelerazione e forza orizzontale.", durationMin: 16, equipment: ["Sled", "Coni"], tags: ["sprint", "accelerazione"] },
  { name: "Ladder + cambi direzione", domain: "atletico", category: "Rapidità", muscleGroups: ["Gambe", "Core"], description: "Coordinazione, frequenza passo e agilità.", durationMin: 12, equipment: ["Scaletta", "Coni"], tags: ["rapidità", "agilità"] },
  { name: "Drop Jump pliometria", domain: "atletico", category: "Pliometria", muscleGroups: ["Gambe"], description: "Stiffness e reattività (RSI), contatto a terra breve.", durationMin: 12, equipment: ["Box"], tags: ["reattività", "pliometria"] },
  { name: "Nordic Hamstring", domain: "atletico", category: "Prevenzione", muscleGroups: ["Catena posteriore"], description: "Eccentrico flessori: riduce ~50% le lesioni agli ischiocrurali (van Dyk 2019).", durationMin: 10, equipment: ["Tappetini"], tags: ["prevenzione", "forza"] },
  { name: "Copenhagen Adduction", domain: "atletico", category: "Prevenzione", muscleGroups: ["Gambe", "Core"], description: "Eccentrico/isometrico adduttori in appoggio laterale: previene le sindromi inguinali (Harøy 2019).", durationMin: 8, equipment: ["Panca"], tags: ["prevenzione", "inguine"] },
  { name: "FIFA 11+", domain: "atletico", category: "Prevenzione", muscleGroups: ["Full body"], description: "Riscaldamento neuromuscolare (corsa, forza, pliometria, equilibrio): −30/50% infortuni (Soligard 2008).", durationMin: 20, equipment: ["Coni"], tags: ["prevenzione", "warmup"] },
  { name: "Propriocezione monopodalica", domain: "atletico", category: "Prevenzione", muscleGroups: ["Gambe"], description: "Equilibrio su superficie instabile: prevenzione distorsioni di caviglia e controllo del valgo.", durationMin: 10, equipment: ["Bosu", "Tavoletta"], tags: ["prevenzione", "propriocezione"] },
  { name: "Calf raise eccentrico", domain: "atletico", category: "Prevenzione", muscleGroups: ["Gambe"], description: "Eccentrico del polpaccio (Alfredson): prevenzione tendinopatia achillea.", durationMin: 8, equipment: ["Step"], tags: ["prevenzione", "achille"] },
  { name: "Core anti-rotazione", domain: "atletico", category: "Core", muscleGroups: ["Core"], description: "Stabilità del tronco e trasferimento di forza.", durationMin: 10, equipment: ["Elastici"], tags: ["core", "stabilità"] },
  { name: "Mobilità anche/caviglia", domain: "atletico", category: "Mobilità", muscleGroups: ["Gambe", "Core"], description: "Routine di mobilità pre-seduta.", durationMin: 10, equipment: ["Tappetini", "Elastici"], tags: ["mobilità", "warmup"] },
];

// Esercitazioni tattiche aggiuntive (in coda: indici 17+, non rompono i template).
const MORE_TACTICAL: ExSeed[] = [
  { name: "Possesso 4v4+3 a tre porte", domain: "tattico", category: "Possesso", description: "Possesso con tre mini-porte: cambio di obiettivo e lettura degli spazi.", durationMin: 16, players: "4v4+3", equipment: ["Casacche", "Mini-porte"], tags: ["possesso", "ampiezza"] },
  { name: "Costruzione a rombo", domain: "tattico", category: "Situazionale", description: "Sviluppo dal basso con rombo di costruzione e mezzali in ricezione tra le linee.", durationMin: 18, players: "Reparti", equipment: ["Coni", "Palloni"], tags: ["costruzione", "smarcamento"] },
  { name: "1v1 + sponda", domain: "tattico", category: "Transizioni", description: "Duelli individuali con appoggio di sponda e conclusione rapida.", durationMin: 12, players: "1v1", equipment: ["Mini-porte", "Palloni"], tags: ["duello", "rapidità"] },
  { name: "Cross & finish a ondate", domain: "tattico", category: "Finalizzazione", description: "Cross dalle fasce e inserimenti a ondate con tempi di attacco dell'area.", durationMin: 18, players: "Reparti", equipment: ["Palloni", "Porte"], tags: ["cross", "inserimenti"] },
  { name: "Pressing a tema 6v6", domain: "tattico", category: "Partita a tema", description: "Riconquista alta con trigger di pressing e gestione della profondità.", durationMin: 20, players: "6 vs 6", equipment: ["Casacche", "Porte"], tags: ["pressing", "riconquista"] },
  { name: "Rondo dinamico 3v1 progressivo", domain: "tattico", category: "Riscaldamento tecnico", description: "Rondo che evolve in 4v2 con cambio di settore: attivazione tecnica a intensità crescente.", durationMin: 12, players: "3v1 → 4v2", equipment: ["Coni", "Palloni"], tags: ["warmup", "trasmissione"] },
];

const EXERCISES: Exercise[] = CLIENTS.flatMap((c) =>
  [...TACTICAL, ...ATHLETIC, ...MORE_TACTICAL].map((e, i) => ({
    ...e,
    id: `${c.id}-ex-${String(i + 1).padStart(2, "0")}`,
    clientId: c.id,
  })),
);

// ----- Template di seduta (campo / palestra) con carico stimato vs effettivo -
const TEMPLATES: SessionTemplate[] = CLIENTS.flatMap((c) => {
  const ex = (n: number) => `${c.id}-ex-${String(n).padStart(2, "0")}`;
  return [
    {
      id: `${c.id}-tpl-01`, clientId: c.id, name: "MD-4 Forza (Palestra)", domain: "palestra",
      goal: "Forza massimale arti inferiori + prevenzione", exerciseIds: [ex(10), ex(7), ex(8), ex(14)],
      muscleGroups: ["Gambe", "Catena posteriore", "Core"], microcycleDay: "MD-4",
      estimated: { durationMin: 60, internalRpe: 7, externalKm: 0, sprints: 0, highIntensityM: 0 },
      actual: { durationMin: 58, internalRpe: 7 },
    },
    {
      id: `${c.id}-tpl-02`, clientId: c.id, name: "MD-3 Intensità (Campo)", domain: "campo",
      goal: "Alta intensità metabolica e situazioni di gioco", exerciseIds: [ex(6), ex(1), ex(3), ex(2)],
      microcycleDay: "MD-3",
      estimated: { durationMin: 80, internalRpe: 8, externalKm: 6.2, sprints: 22, highIntensityM: 620 },
      actual: { durationMin: 78, internalRpe: 8, externalKm: 5.9, sprints: 20, highIntensityM: 580 },
    },
    {
      id: `${c.id}-tpl-03`, clientId: c.id, name: "MD-2 Velocità (Campo)", domain: "campo",
      goal: "Velocità, transizioni e finalizzazione", exerciseIds: [ex(6), ex(3), ex(4)],
      microcycleDay: "MD-2",
      estimated: { durationMin: 70, internalRpe: 6, externalKm: 5.0, sprints: 30, highIntensityM: 800 },
    },
    {
      id: `${c.id}-tpl-04`, clientId: c.id, name: "Upper body (Palestra)", domain: "palestra",
      goal: "Forza parte superiore e core", exerciseIds: [ex(9), ex(13), ex(14)],
      muscleGroups: ["Petto", "Spalle", "Braccia", "Core"],
      estimated: { durationMin: 45, internalRpe: 6, externalKm: 0, sprints: 0, highIntensityM: 0 },
    },
    {
      id: `${c.id}-tpl-05`, clientId: c.id, name: "MD-1 Rifinitura (Campo)", domain: "campo",
      goal: "Attivazione pre-gara, palle inattive e ritmo", exerciseIds: [ex(6), ex(1), ex(4)],
      microcycleDay: "MD-1",
      estimated: { durationMin: 55, internalRpe: 5, externalKm: 3.8, sprints: 12, highIntensityM: 320 },
    },
    {
      id: `${c.id}-tpl-06`, clientId: c.id, name: "MD+1 Recupero (Campo)", domain: "campo",
      goal: "Scarico rigenerante per chi ha giocato", exerciseIds: [ex(6), ex(1)],
      microcycleDay: "MD+1",
      estimated: { durationMin: 35, internalRpe: 3, externalKm: 2.5, sprints: 2, highIntensityM: 60 },
      actual: { durationMin: 34, internalRpe: 3, externalKm: 2.6 },
    },
    {
      id: `${c.id}-tpl-07`, clientId: c.id, name: "Potenza esplosiva (Palestra)", domain: "palestra",
      goal: "Forza esplosiva e pliometria per il salto e lo sprint", exerciseIds: [ex(13), ex(11), ex(7), ex(12)],
      muscleGroups: ["Gambe", "Catena posteriore"], microcycleDay: "MD-3",
      estimated: { durationMin: 50, internalRpe: 7, externalKm: 0, sprints: 0, highIntensityM: 0 },
      actual: { durationMin: 52, internalRpe: 7 },
    },
    {
      id: `${c.id}-tpl-08`, clientId: c.id, name: "Prevenzione & Core (Palestra)", domain: "palestra",
      goal: "Riduzione rischio infortuni e stabilità del tronco", exerciseIds: [ex(14), ex(15), ex(16)],
      muscleGroups: ["Catena posteriore", "Core"],
      estimated: { durationMin: 30, internalRpe: 4, externalKm: 0, sprints: 0, highIntensityM: 0 },
    },
  ] satisfies SessionTemplate[];
});

// ----- Calendario (30 giorni) ------------------------------------------------
// Obiettivi seed per le sedute di allenamento — variano per settimana così il
// registro mostra una distribuzione realistica per obiettivo. Le stringhe devono
// combaciare con le label in lib/objectives.ts (per colore/acronimo/macro-area).
const SEED_OBJ: Record<string, string[]> = {
  "Forza (MD-4)": ["Forza generale / ipertrofia", "Forza massima", "Forza esplosiva", "Potenza", "Aerobico potenza"],
  "Intensità (MD-3)": ["Possesso palla", "Costruzione dal basso", "Pressing / riaggressione", "Possesso palla", "Finalizzazione"],
  "Velocità (MD-2)": ["Transizioni", "Situazionale", "Partita a tema", "Transizioni", "Pressing / riaggressione"],
  "Rifinitura (MD-1)": ["Palle inattive (campo)", "Palle inattive (campo)", "Situazionale", "Palle inattive (campo)", "Finalizzazione"],
  "Scarico + video": ["Defaticamento", "Scarico attivo", "Mobilità / stretching", "Defaticamento", "Rigenerante / massaggio"],
  "Sessione video reparti": ["Analisi avversario", "Nostra prestazione", "Analisi avversario", "Palle inattive (video)", "Nostra prestazione"],
  "Partita di campionato": ["Campionato", "Campionato", "Coppa", "Campionato", "Campionato"],
};
const seedObjective = (title: string, weekIdx: number): string | undefined =>
  SEED_OBJ[title]?.[((weekIdx % 5) + 5) % 5];

const EVENTS: CalendarEvent[] = CLIENTS.flatMap((c) => {
  const list: CalendarEvent[] = [];
  let n = 0;
  for (let d = -7; d <= 22; d++) {
    const wk = Math.floor((d + 7) / 7); // indice settimana 0..4
    const dow = (Date.parse(iso(d)) / 86400000 + 4) % 7; // 0=dom
    if (dow === 0) {
      list.push({ id: `${c.id}-ev-${++n}`, clientId: c.id, title: "Riposo", date: iso(d), slot: "mattina", sessionType: "riposo", assignment: "squadra" });
      continue;
    }
    if (dow === 6) {
      list.push({ id: `${c.id}-ev-${++n}`, clientId: c.id, title: "Partita di campionato", date: iso(d), slot: "pomeriggio", time: "15:00", sessionType: "partita", location: "Stadio", assignment: "squadra", objective: seedObjective("Partita di campionato", wk) });
      continue;
    }
    const map: Record<number, { t: CalendarEvent["sessionType"]; title: string; tpl?: string; loc: string }> = {
      1: { t: "recupero", title: "Scarico + video", tpl: undefined, loc: "Centro sportivo" },
      2: { t: "palestra", title: "Forza (MD-4)", tpl: `${c.id}-tpl-01`, loc: "Palestra" },
      3: { t: "campo", title: "Intensità (MD-3)", tpl: `${c.id}-tpl-02`, loc: "Campo 1" },
      4: { t: "campo", title: "Velocità (MD-2)", tpl: `${c.id}-tpl-03`, loc: "Campo 1" },
      5: { t: "campo", title: "Rifinitura (MD-1)", tpl: undefined, loc: "Campo 1" },
    };
    const m = map[dow];
    list.push({ id: `${c.id}-ev-${++n}`, clientId: c.id, title: m.title, date: iso(d), slot: "mattina", time: "10:30", sessionType: m.t, location: m.loc, assignment: "squadra", templateId: m.tpl, objective: seedObjective(m.title, wk) });
    if (dow === 1) {
      list.push({ id: `${c.id}-ev-${++n}`, clientId: c.id, title: "Sessione video reparti", date: iso(d), slot: "pomeriggio", time: "16:00", sessionType: "video", location: "Sala video", assignment: "squadra", objective: seedObjective("Sessione video reparti", wk) });
    }
  }
  return list;
});

// ----- Presenze seed (registro) ----------------------------------------------
// Presenze deterministiche per le sedute PASSATE (data <= oggi), così il registro
// è già popolato. Infortunati → assenti, in recupero → differenziato, gli altri
// quasi sempre presenti con qualche differenziato/assenza sporadica.
interface SeedAttendance { id: string; entries: Record<string, { status: string; minutes?: number }> }
function buildSeedAttendance(clientId: string): SeedAttendance[] {
  const today = iso(0);
  const roster = ATHLETES.filter((a) => a.clientId === clientId);
  const recs: SeedAttendance[] = [];
  for (const ev of EVENTS) {
    if (ev.clientId !== clientId || ev.sessionType === "riposo" || ev.date > today) continue;
    const r = rng(Math.abs(hashStr(ev.id)));
    const entries: Record<string, { status: string; minutes?: number }> = {};
    let starters = 0;
    roster.forEach((a) => {
      const inj = a.status === "infortunato";
      const rec = a.status === "in recupero";
      const x = r();
      if (ev.sessionType === "partita") {
        if (inj || rec) { entries[a.id] = { status: "non entrato" }; return; }
        if (starters < 11 && x < 0.62) { starters++; entries[a.id] = { status: "titolare", minutes: 70 + Math.floor(r() * 25) }; }
        else if (x < 0.78) entries[a.id] = { status: "subentrato", minutes: 10 + Math.floor(r() * 25) };
        else if (x < 0.88) entries[a.id] = { status: "spezzone", minutes: 5 + Math.floor(r() * 15) };
        else entries[a.id] = { status: "non entrato" };
        return;
      }
      const two = ev.sessionType === "video" || ev.sessionType === "medico"; // solo presente/assente
      if (inj) entries[a.id] = { status: two ? "assente" : "assente" };
      else if (rec) entries[a.id] = { status: two ? "presente" : "differenziato" };
      else if (x < 0.86) entries[a.id] = { status: "presente" };
      else if (!two && x < 0.94) entries[a.id] = { status: "differenziato" };
      else entries[a.id] = { status: "assente" };
    });
    recs.push({ id: ev.id, entries });
  }
  return recs;
}
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ----- Area medica (collegata agli atleti) -----------------------------------
const INJURIES = [
  { injury: "Lesione I grado bicipite femorale", part: "Coscia post. dx", phase: "riatletizzazione" as const, tx: "Lavoro eccentrico progressivo + reintroduzione corsa", mechanism: "Sprint ad alta velocità", severity: "moderato" as const, days: 24 },
  { injury: "Distorsione caviglia", part: "Caviglia sx", phase: "subacuta" as const, tx: "Propriocezione e mobilità, carico parziale", mechanism: "Contrasto di gioco", severity: "moderato" as const, days: 28 },
  { injury: "Sovraccarico tendine rotuleo", part: "Ginocchio dx", phase: "acuta" as const, tx: "Scarico + isometria, gestione del carico", mechanism: "Carico ripetuto", severity: "lieve" as const, days: 14 },
  { injury: "Elongazione adduttore", part: "Inguine sx", phase: "return to play" as const, tx: "Test funzionali superati, rientro graduale in gruppo", mechanism: "Cambio di direzione", severity: "moderato" as const, days: 20 },
];
const DOCTORS = ["Dott. M. Ferri", "Dott.ssa L. Conti", "Dott. A. Greco"];

// Catalogo per lo storico clinico (episodi conclusi).
const INJURY_HISTORY = [
  { injury: "Lesione di II grado del retto femorale", part: "Coscia ant.", type: "infortunio" as const, mechanism: "Tiro in porta", severity: "grave" as const, days: 45 },
  { injury: "Distorsione della caviglia (LLE)", part: "Caviglia", type: "infortunio" as const, mechanism: "Appoggio scomposto", severity: "moderato" as const, days: 26 },
  { injury: "Lombalgia acuta", part: "Rachide lombare", type: "sovraccarico" as const, mechanism: "Sovraccarico funzionale", severity: "lieve" as const, days: 8 },
  { injury: "Sindrome influenzale", part: "—", type: "malattia" as const, mechanism: "Virale stagionale", severity: "lieve" as const, days: 5 },
  { injury: "Tendinopatia rotulea", part: "Ginocchio", type: "sovraccarico" as const, mechanism: "Carico ripetuto", severity: "moderato" as const, days: 22 },
  { injury: "Trauma contusivo", part: "Polpaccio", type: "infortunio" as const, mechanism: "Colpo diretto", severity: "lieve" as const, days: 7 },
  { injury: "Pubalgia", part: "Inguine", type: "sovraccarico" as const, mechanism: "Sovraccarico adduttori", severity: "moderato" as const, days: 32 },
  { injury: "Elongazione del gastrocnemio", part: "Polpaccio", type: "infortunio" as const, mechanism: "Accelerazione", severity: "moderato" as const, days: 18 },
];
const SIDES = ["", " dx", " sx"];

/** Episodi clinici ATTIVI (atleti infortunati / in recupero). */
const MEDICAL_ACTIVE: MedicalRecord[] = ATHLETES.filter(
  (a) => a.status === "infortunato" || a.status === "in recupero",
).map((a, i) => {
  const inj = INJURIES[i % INJURIES.length];
  return {
    id: `${a.clientId}-med-${String(i + 1).padStart(2, "0")}`,
    clientId: a.clientId,
    athleteId: a.id,
    type: a.status === "infortunato" ? "infortunio" : "sovraccarico",
    injury: inj.injury,
    bodyPart: inj.part,
    date: iso(-10 - (i % 12)),
    phase: a.status === "infortunato" ? inj.phase : "riatletizzazione",
    treatment: inj.tx,
    expectedReturn: iso(5 + (i % 18)),
    severity: inj.severity,
    mechanism: inj.mechanism,
    daysOut: inj.days,
    doctor: DOCTORS[i % DOCTORS.length],
  };
});

/** Storico clinico CONCLUSO: episodi passati per atleta (deterministico).
 *  Più episodi per gli atleti più "anziani" di carriera. Alimenta sia la
 *  cartella clinica dell'atleta sia l'archivio dell'Area Medica. */
const MEDICAL_HISTORY: MedicalRecord[] = ATHLETES.flatMap((a) => {
  const r = rng(Math.abs(hashStr(a.id)) + 13);
  const ageY = Math.max(18, Math.round(ageOfAt(a.birthDate, iso(0))));
  const maxEpisodes = ageY >= 30 ? 4 : ageY >= 25 ? 3 : 2;
  const count = Math.floor(r() * (maxEpisodes + 1)); // 0..maxEpisodes
  const out: MedicalRecord[] = [];
  for (let k = 0; k < count; k++) {
    const cat = INJURY_HISTORY[Math.floor(r() * INJURY_HISTORY.length)];
    const startDaysAgo = 150 + Math.floor(r() * 980); // 5 mesi – 3 anni fa
    const start = iso(-startDaysAgo);
    out.push({
      id: `${a.clientId}-medh-${a.shirtNumber}-${k}`,
      clientId: a.clientId,
      athleteId: a.id,
      type: cat.type,
      injury: cat.injury,
      bodyPart: cat.part === "—" ? "—" : cat.part + SIDES[Math.floor(r() * SIDES.length)],
      date: start,
      phase: "conclusa",
      treatment: "Percorso riabilitativo completato, test funzionali superati.",
      severity: cat.severity,
      mechanism: cat.mechanism,
      daysOut: cat.days,
      returnedAt: iso(-startDaysAgo + cat.days),
      doctor: DOCTORS[Math.floor(r() * DOCTORS.length)],
    });
  }
  return out;
});

const MEDICAL: MedicalRecord[] = [...MEDICAL_ACTIVE, ...MEDICAL_HISTORY];

// ----- Carico: GPS + Frequenza cardiaca --------------------------------------
const GPS: GpsRecord[] = [];
ATHLETES.forEach((a, ai) => {
  const r = rng(5000 + ai * 31);
  for (let d = -10; d <= 0; d++) {
    const dow = (Date.parse(iso(d)) / 86400000 + 4) % 7;
    if (dow === 0 || a.status === "infortunato") continue;
    const isMatch = dow === 6;
    const dist = (isMatch ? 10000 : 4500 + r() * 3500) | 0;
    const duration = isMatch ? 95 : (60 + r() * 35) | 0;
    const rpe = Math.min(10, Math.max(2, Math.round((isMatch ? 8 : 5) + (r() - 0.5) * 3)));
    const z4 = (8 + r() * 14) | 0;
    const z5 = ((isMatch ? 10 : 3) + r() * 8) | 0;
    GPS.push({
      id: `${a.clientId}-gps-${a.id}-${d + 10}`,
      clientId: a.clientId,
      athleteId: a.id,
      date: iso(d),
      durationMin: duration,
      totalDistanceM: dist,
      highSpeedM: ((isMatch ? 600 : 250) + r() * 300) | 0,
      sprintCount: ((isMatch ? 22 : 8) + r() * 12) | 0,
      maxSpeedKmh: Number((30 + r() * 4.5).toFixed(1)),
      accelerations: ((isMatch ? 45 : 20) + r() * 20) | 0,
      decelerations: ((isMatch ? 42 : 18) + r() * 20) | 0,
      playerLoad: ((isMatch ? 520 : 260) + r() * 160) | 0,
      rpe,
      sRPE: duration * rpe,
      trimp: Math.round((duration - z4 - z5) * 1.5 + z4 * 2.5 + z5 * 4),
      avgHr: (140 + r() * 20) | 0,
      maxHr: (185 + r() * 12) | 0,
      hrZone4Min: z4,
      hrZone5Min: z5,
    });
  }
});

// ----- Test (collegati agli atleti, coerenti con le KPI) ---------------------
const TEST_DEFS: { type: TestResult["type"]; unit: string; from: (k: PhysicalKpi, r: () => number) => number }[] = [
  { type: "Sprint 30m", unit: "s", from: (k) => Number((4.6 - k.reattivita / 100 * 0.6).toFixed(2)) },
  { type: "CMJ", unit: "cm", from: (k) => Number((28 + k.potenza / 100 * 22).toFixed(1)) },
  { type: "Drop Jump (RSI)", unit: "", from: (k) => Number((1.0 + k.reattivita / 100 * 1.6).toFixed(2)) },
  { type: "1RM Squat", unit: "kg", from: (k) => Math.round(90 + k.forza / 100 * 90) },
  { type: "Asimmetria CMJ", unit: "%", from: (k) => Number((Math.max(0, 100 - k.simmetria) / 5).toFixed(1)) },
  { type: "Yo-Yo IR1", unit: "m", from: (_k, r) => 1600 + Math.round(r() * 1000) },
  { type: "Massa grassa", unit: "%", from: (_k, r) => Number((7 + r() * 6).toFixed(1)) },
];
const TESTS: TestResult[] = [];
ATHLETES.forEach((a, ai) => {
  const r = rng(9000 + ai * 17);
  TEST_DEFS.forEach((t, ti) => {
    TESTS.push({
      id: `${a.clientId}-test-${a.id}-${ti}`,
      clientId: a.clientId,
      athleteId: a.id,
      type: t.type,
      date: iso(-5),
      value: t.from(a.profile, r),
      unit: t.unit,
    });
  });
});

// ----- Campo live ------------------------------------------------------------
const LIVE: LiveSession[] = CLIENTS.map((c) => ({
  id: `${c.id}-live-01`,
  clientId: c.id,
  title: "Seduta odierna",
  date: iso(0),
  status: "programmata",
  templateId: `${c.id}-tpl-02`,
  athleteIds: ATHLETES.filter((a) => a.clientId === c.id && a.status === "disponibile").map((a) => a.id),
}));

// ----- R&D -------------------------------------------------------------------
const RD: RdProject[] = CLIENTS.flatMap((c) => [
  { id: `${c.id}-rd-01`, clientId: c.id, title: "Modello predittivo rischio infortuni", area: "Injury Prevention", status: "in corso", owner: "Data Science", updatedAt: iso(-2) },
  { id: `${c.id}-rd-02`, clientId: c.id, title: "Profilo accel/decel per ruolo", area: "Performance", status: "validazione", owner: "Match Analysis", updatedAt: iso(-5) },
  { id: `${c.id}-rd-03`, clientId: c.id, title: "Correlazione carico esterno vs interno", area: "Load Management", status: "idea", owner: "Sport Science", updatedAt: iso(-9) },
]);

// ----- Import ----------------------------------------------------------------
const IMPORTS: ImportJob[] = CLIENTS.flatMap((c) => [
  { id: `${c.id}-imp-01`, clientId: c.id, source: "GPS Catapult", target: "Carico", date: iso(-1), rows: 1320, status: "completato" },
  { id: `${c.id}-imp-02`, clientId: c.id, source: "CSV Rosa", target: "Rosa", date: iso(-30), rows: 25, status: "completato" },
  { id: `${c.id}-imp-03`, clientId: c.id, source: "ForceDecks (CMJ/DJ)", target: "Test", date: iso(-5), rows: 25, status: "completato" },
  { id: `${c.id}-imp-04`, clientId: c.id, source: "Polar Team Pro", target: "Carico", date: iso(0), rows: 0, status: "in corso" },
]);

// ----- Storico per esercizio (progressione kg nel tempo) ---------------------
export interface ExerciseLog { id: string; clientId: string; athleteId: string; exerciseId: string; exName: string; date: string; kg: number; sets: number; reps: number }
const EX_NAME = new Map(EXERCISES.map((e) => [e.id, e.name]));
// esercizi di forza con carico: Back Squat(07), Hip Thrust(08), Panca(09), CMJ(10)
const HISTORY_SUF = ["07", "08", "09"];
const EX_HISTORY: ExerciseLog[] = [];
ATHLETES.forEach((a, ai) => {
  const r = rng(7000 + ai * 13);
  HISTORY_SUF.forEach((suf) => {
    const exId = `${a.clientId}-ex-${suf}`;
    const base = Math.round(45 + (a.profile.forza / 100) * 85); // ~45–130 kg
    for (let s = 6; s >= 0; s--) {
      EX_HISTORY.push({
        id: `${a.id}-${suf}-${s}`, clientId: a.clientId, athleteId: a.id, exerciseId: exId,
        exName: EX_NAME.get(exId) ?? exId,
        date: iso(-s * 24 - Math.floor(r() * 5)),
        kg: base + (6 - s) * (2 + Math.floor(r() * 3)), // progressione crescente
        sets: 4 + (s % 2 === 0 ? 1 : 0), // 4-5 serie
        reps: 6 + Math.floor(r() * 4), // 6-9 ripetizioni
      });
    }
  });
});

// ============================================================================
// API di accesso
// ============================================================================
export const getAthletes = (clientId: string) => ATHLETES.filter((a) => a.clientId === clientId);
export const getAthlete = (athleteId: string) => ATHLETES.find((a) => a.id === athleteId);
export const getExercises = (clientId: string) => EXERCISES.filter((e) => e.clientId === clientId);
export const getTemplates = (clientId: string) => TEMPLATES.filter((t) => t.clientId === clientId);
export const getEvents = (clientId: string) => EVENTS.filter((e) => e.clientId === clientId);
/** Presenze seed (deterministiche) per le sedute passate del cliente. */
export const getSeedAttendance = (clientId: string) => buildSeedAttendance(clientId);
export const getMedical = (clientId: string) => MEDICAL.filter((m) => m.clientId === clientId);
export const getGps = (clientId: string) => GPS.filter((l) => l.clientId === clientId);
export const getTests = (clientId: string) => TESTS.filter((t) => t.clientId === clientId);
export const getAthleteTests = (athleteId: string) => TESTS.filter((t) => t.athleteId === athleteId);
export const getLive = (clientId: string) => LIVE.filter((l) => l.clientId === clientId);
export const getRd = (clientId: string) => RD.filter((r) => r.clientId === clientId);
export const getImports = (clientId: string) => IMPORTS.filter((i) => i.clientId === clientId);
export const getExerciseHistory = (clientId: string) => EX_HISTORY.filter((h) => h.clientId === clientId);

/** Media squadra delle 4 KPI (per overlay nel radar). */
export function getTeamAverageKpi(clientId: string): PhysicalKpi {
  const a = getAthletes(clientId);
  const avg = (k: keyof PhysicalKpi) => Math.round(a.reduce((s, x) => s + x.profile[k], 0) / Math.max(1, a.length));
  return { forza: avg("forza"), potenza: avg("potenza"), reattivita: avg("reattivita"), simmetria: avg("simmetria") };
}

/** KPI di sintesi per un cliente, orientate alla DISPONIBILITÀ della rosa. */
export function getClientStats(clientId: string) {
  const athletes = getAthletes(clientId);
  const medical = getMedical(clientId);
  const status = (s: string) => athletes.filter((a) => a.status === s).length;
  const pAvg = athletes.length ? Math.round(athletes.reduce((s, a) => s + a.profile.pIndex, 0) / athletes.length) : 0;
  const top = [...athletes].sort((a, b) => b.profile.pIndex - a.profile.pIndex)[0];
  const alert = athletes.filter((a) => flagCount(a) >= 2).length;
  return {
    athletes: athletes.length,
    available: status("disponibile"),
    injured: status("infortunato"),
    recovering: status("in recupero"),
    resting: status("a riposo"),
    openMedical: medical.filter((m) => m.phase !== "conclusa").length,
    rehab: medical.filter((m) => m.phase === "riatletizzazione" || m.phase === "return to play").length,
    upcomingEvents: getEvents(clientId).filter((e) => e.date >= iso(0) && e.sessionType !== "riposo").length,
    pIndexAvg: pAvg,
    topPerformer: top,
    alert,
  };
}

function flagCount(a: Athlete): number {
  const k = a.profile;
  let n = 0;
  if (k.forza < 50) n++;
  if (k.potenza < 50) n++;
  if (k.reattivita < 50) n++;
  if (k.simmetria < 70) n++;
  if (Math.max(k.forza, k.potenza, k.reattivita) - Math.min(k.forza, k.potenza, k.reattivita) > 35) n++;
  return n;
}

export const TODAY = iso(0);
export { iso as isoDay };
