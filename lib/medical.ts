// ============================================================================
// Area Medica — seed deterministico della libreria riabilitativa e dei
// protocolli (template). Stessa logica delle altre sezioni: dati seed lato
// server + aggiunte utente in localStorage. Sostituibile con un DB.
// ============================================================================

import type { MedicalIntake, RehabItem, RehabTemplate, StaffMember } from "./types";
import { CLIENTS } from "./clients";
import { getMedical } from "./data";

type ItemSeed = Omit<RehabItem, "id" | "clientId">;

const ITEMS: ItemSeed[] = [
  { name: "Isometria quadricipite", kind: "esercizio", area: "Ginocchio", description: "Contrazioni isometriche del quadricipite a diverse angolazioni per analgesia e attivazione (Rio 2015).", equipment: ["Tappetino"], durationMin: 12, dosage: "5×45s", intensity: "70% MVIC", evidence: "1b", phases: ["acuta", "subacuta"], cautions: "Interrompere se dolore > 3/10 NRS." },
  { name: "Nordic curl assistito", kind: "esercizio", area: "Catena posteriore", description: "Eccentrico dei flessori assistito, progressione del carico nel rientro (protocollo Askling).", equipment: ["Tappetino", "Elastico"], durationMin: 10, dosage: "3×6 ecc.", intensity: "RPE 7", evidence: "1a", phases: ["riatletizzazione"], cautions: "Solo dopo ROM completo e indolore." },
  { name: "Propriocezione monopodalica", kind: "esercizio", area: "Caviglia", description: "Equilibrio su superficie instabile per riprogrammazione neuromuscolare e controllo articolare.", equipment: ["Bosu", "Tavoletta"], durationMin: 12, dosage: "4×30s/lato", intensity: "occhi aperti → chiusi", evidence: "1b", phases: ["subacuta", "riatletizzazione"] },
  { name: "Core stability anti-rotazione", kind: "esercizio", area: "Core", description: "Stabilità del tronco e controllo lombo-pelvico, trasferimento di forza.", equipment: ["Elastico"], durationMin: 10, dosage: "3×12/lato", intensity: "tenuta 5s", evidence: "2a", phases: ["subacuta", "riatletizzazione", "return to play"] },
  { name: "Reintroduzione corsa (run-walk)", kind: "esercizio", area: "Return to play", description: "Protocollo a intervalli corsa/cammino con incremento progressivo del volume e dell'intensità.", equipment: ["GPS"], durationMin: 25, dosage: "6×(3' run/1' walk)", intensity: "≤ 70% Vmax", evidence: "1b", phases: ["return to play"], cautions: "Monitorare risposta sintomatica a 24h." },
  { name: "Mobilità anca/caviglia", kind: "esercizio", area: "Mobilità", description: "Routine di mobilità articolare con controllo attivo del range, pre-seduta.", equipment: ["Elastico"], durationMin: 10, dosage: "2×10/lato", intensity: "ROM disponibile", evidence: "2b", phases: ["acuta", "subacuta", "riatletizzazione"] },
  { name: "Tecarterapia", kind: "trattamento", area: "Generale", description: "Trasferimento energetico capacitivo/resistivo per accelerare il recupero tissutale e l'analgesia.", equipment: ["Tecar"], durationMin: 20, dosage: "1×/die", intensity: "60–80 W · cap/res", evidence: "2b", phases: ["acuta", "subacuta"] },
  { name: "Laserterapia (HILT)", kind: "trattamento", area: "Generale", description: "Laser ad alta intensità con effetto antinfiammatorio e antalgico localizzato.", equipment: ["Laser"], durationMin: 15, dosage: "3×/sett", intensity: "10–12 J/cm²", evidence: "2a", phases: ["acuta", "subacuta"] },
  { name: "Terapia manuale", kind: "trattamento", area: "Generale", description: "Mobilizzazioni articolari e tecniche dei tessuti molli per ripristino del movimento.", durationMin: 25, dosage: "2–3×/sett", intensity: "grado II–III", evidence: "1b", phases: ["subacuta", "riatletizzazione"] },
  { name: "Crioterapia", kind: "trattamento", area: "Generale", description: "Applicazione di freddo per controllo dell'infiammazione e del dolore in fase acuta.", equipment: ["Ghiaccio"], durationMin: 15, dosage: "ogni 2–3h", intensity: "15–20 min", evidence: "2b", phases: ["acuta"], cautions: "Proteggere la cute, evitare ustioni da freddo." },
  { name: "Onde d'urto (ESWT)", kind: "trattamento", area: "Tendine", description: "Terapia focalizzata per tendinopatie croniche e stimolazione della rigenerazione.", equipment: ["ESWT"], durationMin: 15, dosage: "1×/sett · 3–4 sed.", intensity: "0.2–0.4 mJ/mm²", evidence: "1b", phases: ["riatletizzazione"], cautions: "Controindicata in fase acuta infiammatoria." },
];

type TplSeed = Omit<RehabTemplate, "id" | "clientId" | "itemIds"> & { itemIdx: number[] };

const TEMPLATES: TplSeed[] = [
  { name: "Protocollo acuto", phase: "acuta", goal: "Controllo dolore e infiammazione (PEACE)", area: "Generale", itemIdx: [9, 6, 8], durationWeeks: 1, frequency: "1–2×/die", criteria: "Dolore < 3/10, ROM in recupero, deambulazione senza compenso.", notes: "Scarico relativo, gestione del carico, no gesto-specifico." },
  { name: "Recupero ROM e carico", phase: "subacuta", goal: "Mobilità completa e carico parziale progressivo", area: "Generale", itemIdx: [5, 8, 2, 3], durationWeeks: 2, frequency: "5×/sett", criteria: "ROM completo indolore, forza ≥ 70% controlaterale.", notes: "Carico progressivo monitorato sui sintomi a 24h (LOVE)." },
  { name: "Riatletizzazione", phase: "riatletizzazione", goal: "Forza eccentrica, sprint e gesto sport-specifico", area: "Catena posteriore", itemIdx: [1, 0, 3, 5], durationWeeks: 3, frequency: "4–5×/sett", criteria: "LSI forza ≥ 90%, corsa indolore al 90% Vmax.", notes: "Incremento eccentrico, avvio corsa progressiva e cambi di direzione." },
  { name: "Return to play", phase: "return to play", goal: "Criteri funzionali e rientro in gruppo", area: "Return to play", itemIdx: [4, 2, 3], durationWeeks: 1, frequency: "quotidiano", criteria: "Hop test LSI ≥ 90%, GPS in target, via libera medica.", notes: "Reintegro graduale in gruppo, monitoraggio carico esterno/interno." },
];

const REHAB_ITEMS: RehabItem[] = CLIENTS.flatMap((c) =>
  ITEMS.map((it, i) => ({ ...it, id: `${c.id}-rh-${String(i + 1).padStart(2, "0")}`, clientId: c.id })),
);

const REHAB_TEMPLATES: RehabTemplate[] = CLIENTS.flatMap((c) =>
  TEMPLATES.map((t, i) => {
    const { itemIdx, ...rest } = t;
    return { ...rest, id: `${c.id}-rht-${String(i + 1).padStart(2, "0")}`, clientId: c.id, itemIds: itemIdx.map((n) => `${c.id}-rh-${String(n + 1).padStart(2, "0")}`) };
  }),
);

export const getRehabItems = (clientId: string) => REHAB_ITEMS.filter((i) => i.clientId === clientId);
export const getRehabTemplates = (clientId: string) => REHAB_TEMPLATES.filter((t) => t.clientId === clientId);

/** Intake seed (affidamento) per i casi attivi già in riabilitazione: così il
 *  Diario fisioterapico parte popolato, mentre i casi acuti restano in triage. */
export function getSeedIntakes(clientId: string, physioName?: string, physioRole?: string): MedicalIntake[] {
  return getMedical(clientId)
    .filter((m) => m.phase === "riatletizzazione" || m.phase === "return to play")
    .map((m) => ({
      id: m.id,
      clientId,
      anamnesi: m.mechanism ? `Riferito ${m.mechanism.toLowerCase()}.` : undefined,
      diagnosi: m.injury,
      prognosi: m.daysOut ? `Stop stimato ${m.daysOut} giorni.` : undefined,
      prescrizione: m.treatment,
      assignedTo: physioName,
      assignedRole: physioRole,
      updatedAt: m.date,
    }));
}

/** Mappa il ruolo dello staff a un'area di appartenenza (Performance, Fisioterapia…). */
export function areaOfRole(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("fisio")) return "Fisioterapia";
  if (r.includes("medic") || r.includes("dott") || r.includes("osteo")) return "Area medica";
  if (r.includes("performance") || r.includes("prepar") || r.includes("atlet") || r.includes("riabilit") || r.includes("recupero")) return "Performance";
  if (r.includes("nutri")) return "Nutrizione";
  return role;
}

/** Aree dello staff pertinenti all'Area Medica (no Match Analyst, Team Manager, ecc.). */
const MED_AREAS = new Set(["Fisioterapia", "Area medica", "Performance", "Nutrizione"]);
export const isMedicalStaff = (m: StaffMember): boolean => MED_AREAS.has(areaOfRole(m.role));
/** Filtra lo staff alle sole figure mediche/performance. */
export const medicalStaff = (staff: StaffMember[]): StaffMember[] => staff.filter(isMedicalStaff);
