// ============================================================================
// Obiettivi seduta pre-impostati, raggruppati per macro-categoria (con acronimo
// e colore) e differenziati per TIPO di seduta. Usati nel campo "Obiettivo"
// dell'assegnazione lavoro. I colori sono coerenti con il resto del calendario
// (vedi SESSION_META in lib/sessions.ts).
// ============================================================================

import type { SessionType } from "./types";

export interface ObjectiveItem {
  label: string;
  acr: string;
}
export interface ObjectiveGroup {
  group: string;
  color: string;
  items: ObjectiveItem[];
}
/** Config del campo obiettivo per un tipo di seduta. null = nessun campo. */
export interface ObjectiveConfig {
  /** Etichetta del campo (cambia in base al tipo: "Obiettivo", "Tipo gara"…). */
  fieldLabel: string;
  /** Placeholder dell'opzione vuota. */
  placeholder: string;
  /** Se true il campo è facoltativo (es. tema video). */
  optional?: boolean;
  groups: ObjectiveGroup[];
}

// ---- PALESTRA · obiettivi fisici (invariati) --------------------------------
const PHYSICAL: ObjectiveGroup[] = [
  {
    group: "Condizionamento metabolico",
    color: "#ca8a04",
    items: [
      { label: "Aerobico capacità", acr: "AC" },
      { label: "Aerobico potenza", acr: "AP" },
      { label: "Anaerobico lattacido capacità", acr: "LC" },
      { label: "Anaerobico lattacido potenza", acr: "LP" },
      { label: "Anaerobico alattacido capacità", acr: "AAC" },
      { label: "Anaerobico alattacido potenza", acr: "AAP" },
    ],
  },
  {
    group: "Condizionamento muscolare",
    color: "#dc2626",
    items: [
      { label: "Forza generale / ipertrofia", acr: "FG" },
      { label: "Forza resistente", acr: "FR" },
      { label: "Forza massima", acr: "FM" },
      { label: "Forza esplosiva", acr: "FE" },
      { label: "Potenza", acr: "P" },
      { label: "Forza speciale", acr: "FS" },
      { label: "Forza speciale/specifica", acr: "FSS" },
    ],
  },
  {
    group: "Locomozione",
    color: "#2563eb",
    items: [
      { label: "Velocità", acr: "V" },
      { label: "Rapidità / agilità / frequenza appoggi", acr: "RA" },
      { label: "Resistenza velocità (RSA)", acr: "RSA" },
    ],
  },
  {
    group: "Prevenzione-solidità",
    color: "#16a34a",
    items: [
      { label: "Mobilità statica (stretching)", acr: "MS" },
      { label: "Mobilità dinamica", acr: "MD" },
      { label: "Core stability (gainage)", acr: "CS" },
      { label: "Propriocettività", acr: "PPC" },
    ],
  },
];

// ---- CAMPO · obiettivi tattico/tecnici --------------------------------------
// Voci allineate alle TacticalCategory di Esercizi/Campo Live ("tutto si parla").
const TACTICAL: ObjectiveGroup[] = [
  {
    group: "Fase offensiva",
    color: "#16a34a", // verde campo
    items: [
      { label: "Possesso palla", acr: "POS" },
      { label: "Costruzione dal basso", acr: "COS" },
      { label: "Finalizzazione", acr: "FIN" },
    ],
  },
  {
    group: "Fase difensiva",
    color: "#dc2626", // rosso
    items: [
      { label: "Pressing / riaggressione", acr: "PRE" },
      { label: "Fase difensiva organizzata", acr: "DIF" },
    ],
  },
  {
    group: "Transizioni e situazioni",
    color: "#2563eb", // blu
    items: [
      { label: "Transizioni", acr: "TRA" },
      { label: "Situazionale", acr: "SIT" },
      { label: "Partita a tema", acr: "PAT" },
    ],
  },
  {
    group: "Tecnica",
    color: "#7c3aed", // viola
    items: [
      { label: "Riscaldamento tecnico", acr: "RT" },
      { label: "Palle inattive (campo)", acr: "PIC" },
    ],
  },
];

// ---- RECUPERO · obiettivi rigeneranti ---------------------------------------
const RECOVERY: ObjectiveGroup[] = [
  {
    group: "Recupero",
    color: "#0891b2", // ciano recupero
    items: [
      { label: "Defaticamento", acr: "DEF" },
      { label: "Scarico attivo", acr: "SCA" },
      { label: "Mobilità / stretching", acr: "MOB" },
      { label: "Pool / acqua", acr: "POOL" },
      { label: "Rigenerante / massaggio", acr: "RIG" },
    ],
  },
];

// ---- PARTITA · tipo gara ----------------------------------------------------
const MATCH: ObjectiveGroup[] = [
  {
    group: "Gara",
    color: "#dc2626", // rosso partita
    items: [
      { label: "Campionato", acr: "CAM" },
      { label: "Coppa", acr: "COP" },
      { label: "Amichevole", acr: "AMI" },
      { label: "Test / congiunto", acr: "TEST" },
    ],
  },
];

// ---- SESSIONE VIDEO · tema (facoltativo) ------------------------------------
const VIDEO: ObjectiveGroup[] = [
  {
    group: "Tema video",
    color: "#2563eb", // blu video
    items: [
      { label: "Analisi avversario", acr: "AVV" },
      { label: "Nostra prestazione", acr: "NOI" },
      { label: "Palle inattive (video)", acr: "PIV" },
      { label: "Individuale", acr: "IND" },
    ],
  },
];

// ---- MEDICO · tipo seduta ---------------------------------------------------
const MEDICAL: ObjectiveGroup[] = [
  {
    group: "Medico",
    color: "#d97706", // arancio medico
    items: [
      { label: "Valutazione", acr: "VAL" },
      { label: "Terapia", acr: "TER" },
      { label: "Recupero infortunio", acr: "REC" },
      { label: "Prevenzione", acr: "PREV" },
    ],
  },
];

/** Config del campo "Obiettivo" per ogni tipo di seduta. null = nessun campo. */
export const SESSION_OBJECTIVES: Record<SessionType, ObjectiveConfig | null> = {
  campo: { fieldLabel: "Obiettivo tattico", placeholder: "Scegli obiettivo…", groups: TACTICAL },
  palestra: { fieldLabel: "Obiettivo seduta", placeholder: "Scegli obiettivo…", groups: PHYSICAL },
  recupero: { fieldLabel: "Obiettivo recupero", placeholder: "Scegli obiettivo…", groups: RECOVERY },
  partita: { fieldLabel: "Tipo gara", placeholder: "Scegli tipo gara…", groups: MATCH },
  video: { fieldLabel: "Tema video", placeholder: "Nessun tema (facoltativo)", optional: true, groups: VIDEO },
  medico: { fieldLabel: "Tipo seduta", placeholder: "Scegli tipo…", groups: MEDICAL },
  riposo: null,
};

/** Tipi di seduta "prescrittivi": prevedono esercizi/template e prescrizione. */
export const PRESCRIPTIVE_TYPES: SessionType[] = ["campo", "palestra", "recupero"];

/** Compatibilità: gli obiettivi fisici (palestra) restano esportati come prima. */
export const OBJECTIVE_GROUPS = PHYSICAL;

/** Metadati (acronimo, colore, gruppo) per un obiettivo, cercato per label su
 * tutti i tipi di seduta. */
export function objectiveMeta(label?: string): { acr: string; color: string; group: string } | undefined {
  if (!label) return undefined;
  for (const cfg of Object.values(SESSION_OBJECTIVES)) {
    if (!cfg) continue;
    for (const g of cfg.groups) {
      const it = g.items.find((i) => i.label === label);
      if (it) return { acr: it.acr, color: g.color, group: g.group };
    }
  }
  return undefined;
}
