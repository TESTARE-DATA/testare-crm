// ============================================================================
// Ciclo di vita del caso clinico (collega Presa in carico → Diario → Storico).
//  - triage  : in Presa in carico, in attesa di compilazione + affidamento
//  - diario  : preso in carico (intake con "affidato a") → in riabilitazione
//  - storico : percorso concluso → l'atleta rientra in rosa
// Funzioni pure: usabili sia lato server sia client.
// ============================================================================

import type { MedicalIntake, MedicalRecord } from "./types";

export type CaseStage = "triage" | "diario" | "storico";

export function caseStage(rec: MedicalRecord, intake: MedicalIntake | undefined, closed: boolean): CaseStage {
  if (closed || rec.phase === "conclusa") return "storico";
  if (intake?.assignedTo) return "diario";
  return "triage";
}
