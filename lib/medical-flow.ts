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
