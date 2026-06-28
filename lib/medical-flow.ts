// ============================================================================
// Ciclo di vita del caso clinico (collega Presa in carico → Diario → Storico).
//  - triage  : in Presa in carico, in attesa di compilazione + affidamento
//  - diario  : preso in carico (intake con "affidato a") → in riabilitazione
//  - storico : percorso concluso → l'atleta rientra in rosa
// Funzioni pure: usabili sia lato server sia client.
// ============================================================================

import type { Athlete, InjuryPhase, MedicalIntake, MedicalRecord } from "./types";

export type CaseStage = "triage" | "diario" | "storico";

export function caseStage(rec: MedicalRecord, intake: MedicalIntake | undefined, closed: boolean): CaseStage {
  if (closed || rec.phase === "conclusa") return "storico";
  if (intake?.assignedTo) return "diario";
  return "triage";
}

/** Stato dell'atleta in rosa derivato dalla fase del percorso riabilitativo.
 *  Tiene sincronizzata la rosa con l'Area Medica ("tutto si parla"). */
export function statusForPhase(phase: InjuryPhase): Athlete["status"] {
  if (phase === "conclusa") return "disponibile";
  if (phase === "riatletizzazione" || phase === "return to play") return "in recupero";
  return "infortunato"; // acuta / subacuta
}

/** Override di fase (avanzamento manuale dal Diario), per id di cartella. */
export interface MedicalPhaseOverride {
  id: string; // = id MedicalRecord
  clientId: string;
  phase: InjuryPhase;
  updatedAt: string; // ISO
}

/** Fase EFFETTIVA del caso: override utente sopra la fase del record seed. */
export function effectivePhase(rec: MedicalRecord, overrides: { id: string; phase: InjuryPhase }[]): InjuryPhase {
  return overrides.find((o) => o.id === rec.id)?.phase ?? rec.phase;
}
