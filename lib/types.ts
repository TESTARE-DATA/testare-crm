// ============================================================================
// TESTÀRE CRM — Modello dati condiviso
// Tutte le sezioni dell'app usano questi tipi: gli ID si collegano tra loro
// (atleta → carico → area medica → test → eventi → esercitazioni) così
// "tutto si parla".
// ============================================================================

/** Tavolozza colori usata per brandizzare l'app sul cliente. */
export interface BrandPalette {
  primary: string;
  primaryDark: string;
  accent: string;
  onPrimary: string;
  soft: string;
}

export type ClientStatus = "attivo" | "onboarding" | "sospeso";
export type SubscriptionPlan = "Base" | "Pro" | "Elite";

/** Una società sportiva = un cliente di TESTÀRE. */
export interface Client {
  id: string;
  name: string;
  shortName: string;
  city: string;
  foundedYear: number;
  logo: string;
  colors: BrandPalette;
  status: ClientStatus;
  plan: SubscriptionPlan;
  since: string;
  staff: StaffMember[];
}

export interface StaffMember {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

// ---- Atleta -----------------------------------------------------------------
export type AthleteStatus = "disponibile" | "infortunato" | "in valutazione" | "in recupero" | "a riposo";
export type PlayerRole = "Portiere" | "Difensore" | "Centrocampista" | "Attaccante";
export type Foot = "Destro" | "Sinistro" | "Ambidestro";

/**
 * KPI fisiche come PERCENTILI 0–100 (°) derivate dalla batteria test TESTÀRE.
 * - Forza: 1RM Back Squat · 1RM/peso · IMTP (CEBM 1a–1b)
 * - Potenza: CMJ height · peak power · profilo F–V (CEBM 1a)
 * - Reattività: RSI Drop Jump · RSI Single-Leg DJ (CEBM 1b–2b)
 * - Simmetrie: LSI per task · magnitude + direction (Bishop 2021)
 */
export interface PhysicalKpi {
  forza: number;
  potenza: number;
  reattivita: number;
  simmetria: number;
}

export type PerfTier = "Elite" | "Buono" | "Adeguato" | "Critico";
export type PerfCluster = "Forza-dom" | "Potenza-dom" | "Reattività-dom" | "Bilanciato" | "Deficit multipli";

/** Profilo performance completo dell'atleta, con storico per delta SWC. */
export interface PerfProfile extends PhysicalKpi {
  /** Indice composito (percentile 0–100). */
  pIndex: number;
  /** Valori della sessione precedente (per calcolo Δ). */
  prev: PhysicalKpi & { pIndex: number };
}

export interface Athlete {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO
  nationality: string;
  role: PlayerRole;
  shirtNumber: number;
  foot: Foot;
  status: AthleteStatus;
  // Antropometria
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  wingspanCm: number;
  // Profilo performance derivato dai test
  profile: PerfProfile;
  /** Data di arrivo in squadra (ISO). Il "primo anno" si deriva da questa
   *  rispetto all'inizio della stagione in corso. Impostata dal preparatore. */
  joinedAt: string; // ISO
  /** Cresciuto nel settore giovanile/vivaio della società. Impostato dal preparatore. */
  fromYouth?: boolean;
  /** Foto caricata dal cliente (altrimenti avatar generato dalle iniziali). */
  photoUrl?: string;
}

// ---- Calendario -------------------------------------------------------------
export type SessionType =
  | "campo"
  | "palestra"
  | "partita"
  | "recupero"
  | "video"
  | "medico"
  | "riposo";

export type DaySlot = "mattina" | "pomeriggio";
export type Assignment = "squadra" | "gruppo";

export interface CalendarEvent {
  id: string;
  clientId: string;
  title: string;
  date: string; // ISO (giorno)
  slot: DaySlot;
  time?: string; // "HH:MM" opzionale
  sessionType: SessionType;
  location?: string;
  assignment: Assignment;
  /** Se assignment === "gruppo": atleti selezionati. */
  groupAthleteIds?: string[];
  /** Template di seduta collegato (Area Tecnica → Template). */
  templateId?: string;
  /** Obiettivo della seduta (per registro/statistiche) — vedi lib/objectives.ts. */
  objective?: string;
  notes?: string;
}

// ---- Esercizi / Esercitazioni ----------------------------------------------
/** Dominio dell'esercizio: in campo (tattico) o preparazione atletica (palestra). */
export type ExerciseDomain = "tattico" | "atletico";

export type TacticalCategory =
  | "Possesso"
  | "Finalizzazione"
  | "Transizioni"
  | "Situazionale"
  | "Riscaldamento tecnico"
  | "Partita a tema";

export type AthleticCategory =
  | "Forza"
  | "Potenza"
  | "Sprint"
  | "Rapidità"
  | "Pliometria"
  | "Prevenzione"
  | "Core"
  | "Mobilità";

export type MuscleGroup =
  | "Petto"
  | "Schiena"
  | "Gambe"
  | "Spalle"
  | "Braccia"
  | "Core"
  | "Full body"
  | "Catena posteriore";

export type GoalType = "porte" | "mini-porte" | "porticine" | "sponde" | "nessuna";
export type PitchOrientation = "orizzontale" | "verticale";
export type DrillIntensity = "bassa" | "media" | "alta";

/** Configurazione disegnata in Campo Live (solo esercizi tattici/campo). */
export interface DrillConfig {
  pitchLengthM: number;
  pitchWidthM: number;
  orientation: PitchOrientation;
  // Giocatori
  playersPerTeam: number; // squadra A (compat); per superiorità numerica vedi playersB
  playersB?: number; // giocatori squadra B (se diverso da A)
  formationA?: string; // modulo squadra A ("Libero" o es. "4-3-3")
  formationB?: string; // modulo squadra B
  jollyCount: number; // jolly neutri (sponde)
  goalkeepers: boolean;
  teamAColor: string;
  teamBColor: string;
  // Strutture
  goalType: GoalType;
  ballCount: number;
  sectors: number; // suddivisioni verticali
  channels: number; // canali orizzontali
  // Volume / intensità
  durationMin: number;
  series: number;
  reps: number;
  recoverySec: number; // recupero tra ripetizioni
  intensity: DrillIntensity;
  // Derivati / note
  densityM2: number;
  focus: string;
  rules: string[];
  variants: string[];
}

export interface Exercise {
  id: string;
  clientId: string;
  name: string;
  domain: ExerciseDomain;
  /** Categoria tattica o atletica a seconda del dominio. */
  category: TacticalCategory | AthleticCategory;
  muscleGroups?: MuscleGroup[]; // solo atletico
  description: string;
  durationMin: number;
  players?: string; // es. "8 vs 8" (tattico)
  equipment: string[];
  tags: string[];
  /** Foto/schema dell'esercizio (URL o data-URL). */
  image?: string;
  /** Presente se l'esercizio è stato creato in Campo Live. */
  drill?: DrillConfig;
}

// ---- Template di seduta -----------------------------------------------------
export type TemplateDomain = "campo" | "palestra";

/** Carico stimato/effettivo, interno (RPE/HR) ed esterno (km, sprint). */
export interface LoadEstimate {
  durationMin: number;
  internalRpe: number; // 1-10 atteso
  externalKm: number; // distanza attesa
  sprints: number; // n° sprint attesi
  highIntensityM: number; // metri ad alta intensità attesi
}

export interface SessionTemplate {
  id: string;
  clientId: string;
  name: string;
  domain: TemplateDomain;
  goal: string;
  exerciseIds: string[];
  /** Solo palestra: gruppi muscolari coperti. */
  muscleGroups?: MuscleGroup[];
  microcycleDay?: string; // es. "MD-3"
  estimated: LoadEstimate;
  /** Carico realmente registrato dopo la seduta (per confronto). */
  actual?: Partial<LoadEstimate>;
  /** Foto/schema della seduta (URL o data-URL). */
  image?: string;
  /** Prescrizione completa (serie/rip/intensità/RPE/media) — template creati nel builder. */
  prescription?: ExercisePrescription[];
  /** Circuiti della seduta. */
  circuits?: SessionCircuit[];
  /** True per i template creati dall'utente nel costruttore di sessione. */
  custom?: boolean;
}

// ---- Area medica ------------------------------------------------------------
export type InjuryPhase =
  | "acuta"
  | "subacuta"
  | "riatletizzazione"
  | "return to play"
  | "conclusa";
export type MedicalType = "infortunio" | "sovraccarico" | "malattia" | "controllo";

export type InjurySeverity = "lieve" | "moderato" | "grave";

export interface MedicalRecord {
  id: string;
  clientId: string;
  athleteId: string;
  type: MedicalType;
  injury: string; // tipo di infortunio
  bodyPart: string;
  date: string; // ISO inizio
  phase: InjuryPhase;
  treatment: string; // cosa stanno facendo
  expectedReturn?: string; // ISO
  /** Gravità clinica (per referto e statistiche storiche). */
  severity?: InjurySeverity;
  /** Meccanismo lesionale (es. "sprint ad alta velocità"). */
  mechanism?: string;
  /** Giorni di stop previsti/effettivi. */
  daysOut?: number;
  /** Data di rientro effettiva (ISO) — presente se l'episodio è concluso. */
  returnedAt?: string;
  /** Medico referente. */
  doctor?: string;
  /** Referti allegati (PDF) — nome + data-URL + data estratta dal file. */
  attachments?: { name: string; url: string; date?: string }[];
  /** Punto esatto segnato sull'omino (coordinate immagine), per la mappa anatomica. */
  bodyPoint?: { view: "fronte" | "retro"; x: number; y: number };
}

// ---- Area Medica: presa in carico / riabilitazione --------------------------
/** Scheda clinica del medico, collegata a una cartella (MedicalRecord) per id. */
export interface MedicalIntake {
  id: string; // = id del MedicalRecord
  clientId: string;
  // --- Inquadramento ---
  dataInfortunio?: string; // ISO
  meccanismo?: string;
  gravita?: InjurySeverity;
  // --- Valutazione ---
  anamnesi?: string;
  esameObiettivo?: string;
  sospettoDiagnostico?: string; // ipotesi iniziale del medico, prima degli esami
  esamiStrumentali?: string;
  diagnosi?: string;
  // --- Prognosi ---
  prognosiGiorni?: number; // stop stimato
  prognosi?: string; // criteri di rientro / note prognostiche
  // --- Piano ---
  prescrizione?: string; // piano terapeutico
  obiettivi?: string; // obiettivi riabilitativi
  cautele?: string; // indicazioni e cautele
  /** Membro dello staff a cui è affidato l'atleta. */
  assignedTo?: string;
  assignedRole?: string;
  updatedAt: string; // ISO
}

/** Chiusura di un percorso riabilitativo: l'atleta rientra in rosa e il caso
 *  finisce nello storico infortuni stagionale. id = id della cartella. */
export interface MedicalClosure {
  id: string; // = id MedicalRecord
  clientId: string;
  athleteId: string;
  closedAt: string; // ISO
  outcome?: string;
}

export type RehabKind = "esercizio" | "trattamento";
/** Voce della libreria riabilitativa (esercizio rieducativo o terapia). */
export interface RehabItem {
  id: string;
  clientId: string;
  name: string;
  kind: RehabKind;
  area: string; // distretto/focus (es. "Ginocchio", "Catena posteriore")
  description: string;
  equipment?: string[];
  durationMin: number;
  /** Dosaggio (es. "4×8 ecc.", "3×30s"). */
  dosage?: string;
  /** Intensità / parametri (es. "RPE 6", "Tecar 60W"). */
  intensity?: string;
  /** Livello di evidenza (es. "1a", "2b"). */
  evidence?: string;
  /** Avvertenze / criteri di stop. */
  cautions?: string;
  /** Fasi in cui è indicata. */
  phases?: InjuryPhase[];
}

/** Voce del diario fisioterapico (una seduta di riabilitazione). */
export type DiaryEntryKind = "seduta" | "visita";
export interface PhysioDiaryEntry {
  id: string;
  clientId: string;
  athleteId: string;
  date: string; // ISO
  /** Seduta di trattamento (default) o visita/controllo medico nel percorso. */
  kind?: DiaryEntryKind;
  area: string;
  treatment: string;
  durationMin: number;
  pain?: number; // 0–10 (NRS)
  notes?: string;
  /** Chi ha compilato la voce e l'area di appartenenza (es. Fisioterapia). */
  author?: string;
  authorArea?: string;
}

/** Protocollo riabilitativo (template) che compone voci della libreria. */
export interface RehabTemplate {
  id: string;
  clientId: string;
  name: string;
  phase: InjuryPhase;
  goal: string;
  area: string;
  itemIds: string[];
  notes?: string;
  /** Durata indicativa in settimane. */
  durationWeeks?: number;
  /** Frequenza settimanale (es. "5×/sett"). */
  frequency?: string;
  /** Criteri oggettivi di passaggio alla fase successiva. */
  criteria?: string;
}

// ---- Carico: esterno (GPS) + interno (RPE/HR) -------------------------------
export interface GpsRecord {
  id: string;
  clientId: string;
  athleteId: string;
  date: string; // ISO
  durationMin: number;
  // ESTERNO (GPS)
  totalDistanceM: number;
  highSpeedM: number; // distanza >19.8 km/h
  sprintCount: number;
  maxSpeedKmh: number;
  accelerations: number; // >3 m/s²
  decelerations: number;
  playerLoad: number;
  // INTERNO (percezione + cuore)
  rpe: number; // 0-10 (Borg CR10)
  sRPE: number; // durationMin * rpe (AU)
  trimp: number; // Training Impulse (Edwards) da zone HR
  avgHr: number;
  maxHr: number;
  hrZone4Min: number; // minuti in Z4
  hrZone5Min: number; // minuti in Z5
}

// ---- Misurazioni interne (rilevazioni rapide dello staff) -------------------
/** Misura o test rapido rilevato internamente dalla società (non la batteria
 *  neuromuscolare TESTÀRE). Es. peso, plicometria, sprint, salto. */
export interface Measurement {
  id: string;
  clientId: string;
  athleteId: string;
  date: string; // ISO
  category: string; // es. "Antropometria", "Velocità", "Potenza", "Mobilità"
  type: string; // es. "Peso", "Sprint 10m"
  value: number;
  unit: string;
  recordedBy?: string;
  notes?: string;
}

// ---- Test -------------------------------------------------------------------
export type TestType =
  | "Sprint 30m"
  | "CMJ"
  | "Yo-Yo IR1"
  | "1RM Squat"
  | "Drop Jump (RSI)"
  | "Asimmetria CMJ"
  | "Massa grassa";

export interface TestResult {
  id: string;
  clientId: string;
  athleteId: string;
  type: TestType;
  date: string; // ISO
  value: number;
  unit: string;
}

// ---- Campo Live -------------------------------------------------------------
export type LiveStatus = "in corso" | "programmata" | "completata";

export interface LiveSession {
  id: string;
  clientId: string;
  title: string;
  date: string; // ISO
  status: LiveStatus;
  templateId?: string;
  athleteIds: string[];
}

// ---- Programmazione (assegnazione lavoro → monitoraggio atleta) -------------
export type AssignmentKind = "esercizio" | "template" | "seduta";
export type AssignmentStatus = "assegnato" | "completato";

/** Media allegato a un esercizio (immagine caricata o link video). */
export interface SessionMedia { kind: "image" | "video"; url: string }

/** Prescrizione di un singolo esercizio (serie/ripetizioni/carico/recupero). */
export interface ExercisePrescription {
  exerciseId: string;
  name: string;
  sets?: number;
  reps?: string; // "10", "8-10", "30s", "10 per lato"…
  kg?: number;
  restSec?: number;
  durationMin?: number; // esercizi a tempo (campo)
  note?: string; // indicazioni (es. "profondi e lenti")
  intensity?: string; // intensità libera (es. "70%", "20 kg", "max")
  rpe?: number; // RPE target 1-10
  media?: SessionMedia[]; // note visive: immagini / video
  circuitId?: string; // se l'esercizio fa parte di un circuito
}

/** Circuito: gruppo di esercizi eseguiti a giri. */
export interface SessionCircuit { id: string; rounds: number; restSec: number }

export type WorkFormat = "standard" | "circuito";

export interface WorkAssignment {
  id: string;
  clientId: string;
  kind: AssignmentKind;
  refId: string; // id esercizio o template
  refName: string; // nome (cache per visualizzazione)
  domain?: ExerciseDomain | TemplateDomain; // tattico/atletico · campo/palestra
  /** Tipo di seduta (campo/palestra/partita/...) — guida obiettivo e carico. */
  sessionType?: SessionType;
  athleteIds: string[];
  date: string; // ISO giorno previsto
  /** Obiettivo della seduta (es. "forza esplosiva arti inferiori"). */
  objective?: string;
  sets?: number;
  reps?: number;
  note?: string;
  /** Carico interno stimato per atleta (AU) — per monitoraggio. */
  estLoad: number;
  durationMin: number;
  status: AssignmentStatus;
  /** Prescrizione per esercizio (serie/rip/kg/recupero). */
  prescription?: ExercisePrescription[];
  /** Formato esecuzione: a stazioni o circuito. */
  format?: WorkFormat;
  rounds?: number; // giri (circuito)
  roundRestSec?: number; // recupero tra i giri
  /** Circuiti presenti nella sessione (per prescrizioni multi-blocco). */
  circuits?: SessionCircuit[];
}

// ---- Piano di Allenamento (periodizzazione a lungo termine) -----------------
/** Tipo di mesociclo (fase pluri-settimanale della stagione). */
export type MesocycleType =
  | "preparazione"
  | "competitivo"
  | "richiamo"
  | "scarico"
  | "transizione";

/** Livello di carico programmato di un microciclo (settimana). */
export type PlanIntensity = "scarico" | "medio" | "carico" | "picco";

/** Macrociclo / stagione: contenitore temporale del piano. */
export interface PlanMeta {
  id: string; // "meta" (singleton per cliente)
  clientId: string;
  name: string;
  seasonStart: string; // ISO
  seasonEnd: string; // ISO
}

/** Mesociclo: fase della stagione con obiettivo dominante. */
export interface Mesocycle {
  id: string;
  clientId: string;
  name: string;
  type: MesocycleType;
  startDate: string; // ISO
  endDate: string; // ISO
  /** Obiettivo/idea guida della fase (testo libero). */
  focus?: string;
}

/** Microciclo: override settimanale (chiave = lunedì ISO della settimana). */
export interface PlanWeek {
  id: string; // weekStart ISO (lunedì)
  clientId: string;
  weekStart: string; // ISO lunedì
  /** Obiettivo tattico dominante della settimana (label da lib/objectives). */
  tacticalFocus?: string;
  /** Obiettivo fisico dominante della settimana (label da lib/objectives). */
  physicalFocus?: string;
  intensity?: PlanIntensity;
  note?: string;
}

/** Programmazione del singolo giorno, su due corsie (tattica/fisica). */
export interface PlanDay {
  id: string; // data ISO
  clientId: string;
  date: string; // ISO
  /** Obiettivo tattico/campo (label da lib/objectives TACTICAL). */
  tacticalObjective?: string;
  /** Obiettivo fisico/palestra (label da lib/objectives PHYSICAL). */
  physicalObjective?: string;
  note?: string;
}

// ---- R&D --------------------------------------------------------------------
export type RdStatus = "idea" | "in corso" | "validazione" | "completato";

export interface RdProject {
  id: string;
  clientId: string;
  title: string;
  area: string;
  status: RdStatus;
  owner: string;
  updatedAt: string; // ISO
}

// ---- Import -----------------------------------------------------------------
export type ImportStatus = "completato" | "in corso" | "errore";

export interface ImportJob {
  id: string;
  clientId: string;
  source: string;
  target: string;
  date: string; // ISO
  rows: number;
  status: ImportStatus;
}
