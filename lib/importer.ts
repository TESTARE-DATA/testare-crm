// ============================================================================
// Motore di import dati (CSV) — parsing robusto + abbinamento atleti + mapping
// verso le entità dell'app. Funzioni PURE (testabili, lato client):
//   1. parseCsv(text)            → { headers, rows }
//   2. analyze(kind, rows, roster) → PreviewRow[]  (con stato e abbinamento)
//   3. build<Kind>(rows, clientId) → entità tipizzate pronte da salvare
// Gestisce delimitatori ; , \t, virgolette, BOM, decimali italiani (virgola),
// date ISO e gg/mm/aaaa, e sinonimi di intestazione IT/EN dei principali export
// (Catapult, STATSports, Polar, ForceDecks, Excel della società).
// ============================================================================

import type { Athlete, Foot, GpsRecord, Measurement, PlayerRole } from "./types";

export type ImportKind = "gps" | "misura" | "rosa";

export interface AthleteLite {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber: number;
  role?: PlayerRole;
}

export interface RowStatus {
  status: "ok" | "warn" | "error";
  message?: string;
}

export interface PreviewRow extends RowStatus {
  index: number;
  athleteId: string | null; // null = nuovo (rosa) o non abbinato
  athleteLabel: string; // riferimento atleta com'era nel file
  needsAthlete: boolean; // true se manca l'abbinamento (gps/misura)
  dataValid: boolean; // true se i dati (a parte l'atleta) sono validi
  cells: { label: string; value: string }[]; // anteprima leggibile
  payload: Record<string, unknown>; // campi mappati (entità senza id/clientId/athleteId)
}

// ---- utility di base --------------------------------------------------------
const norm = (s: string) =>
  s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // accenti
    .replace(/[._]/g, " ").replace(/\s+/g, " ");

/** Numero da stringa con decimali italiani (1.234,5 → 1234.5). null se vuoto/NaN. */
function parseNum(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", "."); // 1.234,5
  else if (s.includes(",")) s = s.replace(",", "."); // 12,5
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Data → ISO YYYY-MM-DD. Accetta ISO, gg/mm/aaaa, gg-mm-aaaa. null se invalida. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0"), mo = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---- parsing CSV ------------------------------------------------------------
export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[]; // chiave = intestazione NORMALIZZATA
}

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delim = detectDelimiter(lines[0]);
  const rawHeaders = splitLine(lines[0], delim);
  const headers = rawHeaders.map(norm);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) row[h] = cells[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

/** Primo valore non vuoto tra i sinonimi (chiavi già normalizzate). */
function pick(row: Record<string, string>, synonyms: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    for (const syn of synonyms) {
      if (key === syn || key.includes(syn)) {
        const v = row[key];
        if (v != null && v !== "") return v;
      }
    }
  }
  return undefined;
}

// ---- abbinamento atleta -----------------------------------------------------
const SHIRT_SYN = ["numero", "maglia", "dorsale", "shirt", "number", "#", "num", "n."];
const NAME_SYN = ["atleta", "giocatore", "player", "nominativo", "name"];
const FIRST_SYN = ["nome", "first name", "firstname", "first"];
const LAST_SYN = ["cognome", "last name", "lastname", "surname", "last"];

function resolveAthlete(row: Record<string, string>, roster: AthleteLite[]): { id: string | null; label: string } {
  // 1) per numero di maglia (più affidabile)
  const shirtRaw = pick(row, SHIRT_SYN);
  const shirt = shirtRaw != null ? parseNum(shirtRaw) : null;
  if (shirt != null) {
    const a = roster.find((x) => x.shirtNumber === shirt);
    if (a) return { id: a.id, label: `#${shirt}` };
  }
  // 2) per nome (cognome / "nome cognome" / "cognome nome" / campo unico)
  const last = pick(row, LAST_SYN);
  const first = pick(row, FIRST_SYN);
  const full = pick(row, NAME_SYN) ?? [first, last].filter(Boolean).join(" ");
  const label = full || (shirt != null ? `#${shirt}` : "—");
  if (full) {
    const nf = norm(full);
    // match esatto su nome+cognome (in qualsiasi ordine) o solo cognome
    let a = roster.find((x) => {
      const fn = norm(`${x.firstName} ${x.lastName}`), nf2 = norm(`${x.lastName} ${x.firstName}`);
      return nf === fn || nf === nf2;
    });
    if (!a && last) { const nl = norm(last); a = roster.find((x) => norm(x.lastName) === nl); }
    if (!a) { const tokens = nf.split(" ").filter(Boolean); a = roster.find((x) => tokens.includes(norm(x.lastName))); }
    if (a) return { id: a.id, label };
  }
  return { id: null, label };
}

// ---- mapping ruolo / piede --------------------------------------------------
function mapRole(raw: string | undefined): PlayerRole {
  const s = norm(raw ?? "");
  if (/(portiere|goalkeeper|^gk$|^p$|^por$)/.test(s)) return "Portiere";
  if (/(difensore|defender|^d$|^dif$|^def$|terzino|centrale)/.test(s)) return "Difensore";
  if (/(attaccante|forward|striker|^a$|^att$|^fw$|punta|ala)/.test(s)) return "Attaccante";
  return "Centrocampista";
}
function mapFoot(raw: string | undefined): Foot {
  const s = norm(raw ?? "");
  if (/(sinistr|left|^sx$|^l$|^s$)/.test(s)) return "Sinistro";
  if (/(ambidestr|both|entrambi)/.test(s)) return "Ambidestro";
  return "Destro";
}

const MEAS_CATEGORY: { re: RegExp; cat: string }[] = [
  { re: /(peso|massa|plicometr|bmi|circonfer|altezza)/, cat: "Antropometria" },
  { re: /(sprint|velocit|10m|20m|30m|accel)/, cat: "Velocità" },
  { re: /(cmj|squat jump|drop|salto|jump|potenza)/, cat: "Potenza" },
  { re: /(1rm|forza|panca|stacco)/, cat: "Forza" },
  { re: /(sit|reach|mobilit|flessib)/, cat: "Mobilità" },
  { re: /(plank|core)/, cat: "Core" },
  { re: /(fc|cuore|hr|vo2|lattat)/, cat: "Fisiologia" },
];
function inferCategory(type: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  const s = norm(type);
  return MEAS_CATEGORY.find((c) => c.re.test(s))?.cat ?? "Generale";
}

// ---- definizioni dei tipi di import (per UI + modelli) ----------------------
export interface ImportTypeDef {
  kind: ImportKind;
  label: string;
  icon: string;
  blurb: string; // cosa carichi
  lands: string; // dove finisce (testo)
  href: string; // slug di destinazione per il link finale
  unitLabel: string; // plurale: "sedute" / "misure" / "atleti"
  unitOne: string; // singolare: "seduta" / "misura" / "atleta"
  templateName: string;
  templateHeaders: string[];
  templateRows: string[][];
}

export const IMPORT_TYPES: ImportTypeDef[] = [
  {
    kind: "gps",
    label: "Carico · GPS e cuore",
    icon: "live",
    blurb: "Distanza, sprint, alta velocità, Player Load, RPE e frequenza cardiaca per atleta e seduta.",
    lands: "Carico, GPS, Cardiofrequenzimetro e Data Analysis",
    href: "carico",
    unitLabel: "sedute",
    unitOne: "seduta",
    templateName: "modello-carico-gps.csv",
    templateHeaders: ["Numero", "Atleta", "Data", "Durata (min)", "Distanza (m)", "Alta velocità (m)", "Sprint", "Vel max (km/h)", "Player Load", "RPE", "FC media", "FC max"],
    templateRows: [["10", "Rossi Marco", "30/06/2026", "78", "9450", "560", "21", "32.4", "510", "8", "162", "192"]],
  },
  {
    kind: "misura",
    label: "Test e misurazioni",
    icon: "stopwatch",
    blurb: "Misure rapide dello staff: peso, plicometria, sprint, salti, mobilità, test fisici.",
    lands: "Misurazioni interne e nella scheda di ogni atleta",
    href: "test/misurazioni",
    unitLabel: "misure",
    unitOne: "misura",
    templateName: "modello-misurazioni.csv",
    templateHeaders: ["Numero", "Atleta", "Data", "Tipo", "Valore", "Unità", "Categoria", "Note"],
    templateRows: [
      ["10", "Rossi Marco", "30/06/2026", "Sprint 10m", "1,71", "s", "Velocità", ""],
      ["7", "Bianchi Luca", "30/06/2026", "CMJ", "42,5", "cm", "Potenza", "pedana"],
    ],
  },
  {
    kind: "rosa",
    label: "Rosa · anagrafica",
    icon: "users",
    blurb: "Aggiungi atleti alla rosa: nome, ruolo, numero, data di nascita, altezza e peso.",
    lands: "Rosa, e da lì in tutte le sezioni dell'app",
    href: "rosa",
    unitLabel: "atleti",
    unitOne: "atleta",
    templateName: "modello-rosa.csv",
    templateHeaders: ["Nome", "Cognome", "Ruolo", "Numero", "Data di nascita", "Nazionalità", "Piede", "Altezza (cm)", "Peso (kg)"],
    templateRows: [["Marco", "Rossi", "Centrocampista", "10", "12/05/2001", "Italia", "Destro", "180", "75"]],
  },
];

export const getType = (kind: ImportKind) => IMPORT_TYPES.find((t) => t.kind === kind)!;

/** CSV del modello scaricabile (delimitatore ; per Excel italiano). */
export function buildTemplateCsv(kind: ImportKind): string {
  const t = getType(kind);
  const esc = (c: string) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return [t.templateHeaders, ...t.templateRows].map((r) => r.map(esc).join(";")).join("\r\n");
}

// ---- analisi righe → anteprima ---------------------------------------------
const fmtNum = (n: number | null) => (n == null ? "—" : String(n));

export function analyze(kind: ImportKind, parsed: ParsedCsv, roster: AthleteLite[]): PreviewRow[] {
  return parsed.rows.map((row, index) => {
    if (kind === "rosa") return analyzeRosa(row, index, roster);
    return analyzeAthleteRow(kind, row, index, roster);
  });
}

function analyzeAthleteRow(kind: "gps" | "misura", row: Record<string, string>, index: number, roster: AthleteLite[]): PreviewRow {
  const { id, label } = resolveAthlete(row, roster);
  const dateRaw = pick(row, ["data", "date", "giorno", "day"]);
  const date = parseDate(dateRaw) ?? todayISO();
  const dateDefaulted = !parseDate(dateRaw);

  if (kind === "gps") {
    const num = (syn: string[]) => parseNum(pick(row, syn));
    const durationMin = num(["durata", "duration", "minuti", "minutes", "tempo", "min"]) ?? 0;
    const totalDistanceM = num(["distanza", "distance", "metri", "dist"]) ?? 0;
    const highSpeedM = num(["alta velocita", "high speed", "hsr", "hi speed", "hi-speed", "hsd"]) ?? 0;
    const sprintCount = num(["sprint"]) ?? 0;
    const maxSpeedKmh = num(["vel max", "velocita max", "max speed", "top speed", "vmax", "max vel"]) ?? 0;
    const accelerations = num(["accelerazioni", "accel", "acc"]) ?? 0;
    const decelerations = num(["decelerazioni", "decel", "dec"]) ?? 0;
    const playerLoad = num(["player load", "playerload", " pl", "carico accelerometrico"]) ?? 0;
    const rpe = num(["rpe", "sforzo", "borg"]) ?? 0;
    const avgHr = num(["fc media", "hr media", "avg hr", "frequenza media", "fcmedia"]) ?? 0;
    const maxHr = num(["fc max", "hr max", "frequenza max", "fcmax"]) ?? 0;
    const hrZone4Min = num(["z4", "zona 4"]) ?? 0;
    const hrZone5Min = num(["z5", "zona 5"]) ?? 0;
    const sRPE = Math.round(durationMin * rpe);
    const trimp = Math.round(Math.max(0, durationMin - hrZone4Min - hrZone5Min) * 1.5 + hrZone4Min * 2.5 + hrZone5Min * 4);

    const hasData = totalDistanceM || durationMin || playerLoad || sprintCount || avgHr;
    const cells = [
      { label: "Data", value: date },
      { label: "Distanza", value: totalDistanceM ? `${(totalDistanceM / 1000).toFixed(1)} km` : "—" },
      { label: "Sprint", value: fmtNum(sprintCount || null) },
      { label: "RPE", value: fmtNum(rpe || null) },
      { label: "Player Load", value: fmtNum(playerLoad || null) },
    ];
    const dataValid = !!hasData;
    let st: RowStatus = { status: "ok" };
    if (!dataValid) st = { status: "error", message: "Nessun dato di carico valido in questa riga." };
    else if (!id) st = { status: "error", message: "Atleta non riconosciuto — abbinalo a destra." };
    else if (dateDefaulted) st = { status: "warn", message: "Data non trovata: userò oggi." };

    return {
      index, athleteId: id, athleteLabel: label, needsAthlete: !id, dataValid, cells, ...st,
      payload: { date, durationMin, totalDistanceM, highSpeedM, sprintCount, maxSpeedKmh, accelerations, decelerations, playerLoad, rpe, sRPE, trimp, avgHr, maxHr, hrZone4Min, hrZone5Min },
    };
  }

  // misura
  const type = (pick(row, ["tipo", "type", "misura", "test", "parametro", "voce"]) ?? "").trim();
  const value = parseNum(pick(row, ["valore", "value", "risultato", "result", "misura "]));
  const unit = (pick(row, ["unita", "unit", "u.m", "um"]) ?? "").trim();
  const category = inferCategory(type, pick(row, ["categoria", "category", "area"]));
  const notes = (pick(row, ["note", "notes", "commento", "annotazioni"]) ?? "").trim();
  const cells = [
    { label: "Data", value: date },
    { label: "Tipo", value: type || "—" },
    { label: "Valore", value: value == null ? "—" : `${value}${unit ? " " + unit : ""}` },
    { label: "Categoria", value: category },
  ];
  const dataValid = !!type && value != null;
  let st: RowStatus = { status: "ok" };
  if (!type) st = { status: "error", message: "Manca il tipo di misura." };
  else if (value == null) st = { status: "error", message: "Valore mancante o non numerico." };
  else if (!id) st = { status: "error", message: "Atleta non riconosciuto — abbinalo a destra." };
  else if (dateDefaulted) st = { status: "warn", message: "Data non trovata: userò oggi." };

  return {
    index, athleteId: id, athleteLabel: label, needsAthlete: !id, dataValid, cells, ...st,
    payload: { date, category, type, value: value ?? 0, unit, notes: notes || undefined },
  };
}

function analyzeRosa(row: Record<string, string>, index: number, roster: AthleteLite[]): PreviewRow {
  const firstName = (pick(row, FIRST_SYN) ?? "").trim();
  const lastName = (pick(row, LAST_SYN) ?? "").trim();
  // campo unico "Atleta"/"Nominativo" → split in nome+cognome se nome/cognome assenti
  if ((!firstName || !lastName)) {
    const full = pick(row, NAME_SYN);
    if (full) {
      const parts = full.trim().split(/\s+/);
      if (parts.length >= 2) { /* assume "Nome Cognome" */ }
    }
  }
  const fullName = pick(row, NAME_SYN);
  let fn = firstName, ln = lastName;
  if ((!fn || !ln) && fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) { fn = fn || parts[0]; ln = ln || parts.slice(1).join(" "); }
    else ln = ln || fullName.trim();
  }
  const role = mapRole(pick(row, ["ruolo", "role", "posizione", "position"]));
  const shirtNumber = parseNum(pick(row, SHIRT_SYN)) ?? 0;
  const birthDate = parseDate(pick(row, ["data di nascita", "nascita", "birthdate", "dob", "born"])) ?? "2002-01-01";
  const nationality = (pick(row, ["nazionalita", "nazione", "nationality", "country", "paese"]) ?? "Italia").trim();
  const foot = mapFoot(pick(row, ["piede", "foot"]));
  const heightCm = parseNum(pick(row, ["altezza", "height", "statura"])) ?? 180;
  const weightKg = parseNum(pick(row, ["peso", "weight"])) ?? 75;

  const cells = [
    { label: "Ruolo", value: role },
    { label: "Numero", value: shirtNumber ? String(shirtNumber) : "—" },
    { label: "Nascita", value: birthDate },
    { label: "Altezza", value: `${heightCm} cm` },
  ];
  let st: RowStatus = { status: "ok" };
  if (!ln) st = { status: "error", message: "Manca il cognome." };
  else if (shirtNumber && roster.some((a) => a.shirtNumber === shirtNumber)) st = { status: "warn", message: `Numero ${shirtNumber} già in rosa: verrà comunque aggiunto.` };

  return {
    index, athleteId: null, athleteLabel: `${fn} ${ln}`.trim(), needsAthlete: false, dataValid: !!ln, cells, ...st,
    payload: { firstName: fn, lastName: ln, role, shirtNumber, birthDate, nationality, foot, heightCm, weightKg },
  };
}

// ---- costruzione entità finali ---------------------------------------------
const rid = (prefix: string) =>
  typeof crypto !== "undefined" && crypto.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Righe importabili: stato ≠ error e (per gps/misura) atleta abbinato. */
export function importableRows(rows: PreviewRow[]): PreviewRow[] {
  return rows.filter((r) => r.status !== "error");
}

export function buildGps(rows: PreviewRow[], clientId: string): GpsRecord[] {
  return importableRows(rows).filter((r) => r.athleteId).map((r) => ({
    id: rid(`${clientId}-gps`), clientId, athleteId: r.athleteId!, ...(r.payload as Omit<GpsRecord, "id" | "clientId" | "athleteId">),
  }));
}

export function buildMeasurements(rows: PreviewRow[], clientId: string): Measurement[] {
  return importableRows(rows).filter((r) => r.athleteId).map((r) => ({
    id: rid(`${clientId}-meas`), clientId, athleteId: r.athleteId!, ...(r.payload as Omit<Measurement, "id" | "clientId" | "athleteId">),
  }));
}

export function buildAthletes(rows: PreviewRow[], clientId: string): Athlete[] {
  return importableRows(rows).map((r) => {
    const p = r.payload as { firstName: string; lastName: string; role: PlayerRole; shirtNumber: number; birthDate: string; nationality: string; foot: Foot; heightCm: number; weightKg: number };
    return {
      id: rid(`${clientId}-ath`), clientId,
      firstName: p.firstName, lastName: p.lastName, role: p.role, shirtNumber: p.shirtNumber,
      birthDate: p.birthDate, nationality: p.nationality, foot: p.foot, status: "disponibile" as const,
      heightCm: p.heightCm, weightKg: p.weightKg, bodyFatPct: 10, wingspanCm: p.heightCm,
      profile: { forza: 50, potenza: 50, reattivita: 50, simmetria: 85, pIndex: 55, prev: { forza: 50, potenza: 50, reattivita: 50, simmetria: 85, pIndex: 55 } },
      joinedAt: todayISO(), fromYouth: false,
    } satisfies Athlete;
  });
}
