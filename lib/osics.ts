// ============================================================================
// Sport Medicine Diagnostic Coding System (stile OSICS): set CURATO di diagnosi
// più comuni nel calcio, raggruppate per regione corporea, da scegliere in una
// lista. È un sottoinsieme di partenza, estendibile con la tabella ufficiale
// OSICS-10 (o l'Excel della società). I codici sono uno schema interno coerente,
// da mappare 1:1 ai codici ufficiali quando disponibili.
// ============================================================================

export interface OsicsCode {
  code: string;
  label: string;
  region: string;
}

export const OSICS: OsicsCode[] = [
  // Testa / Collo
  { code: "HN1", label: "Trauma cranico / commozione", region: "Testa e collo" },
  { code: "HN2", label: "Trauma facciale", region: "Testa e collo" },
  { code: "NK1", label: "Cervicalgia / distorsione cervicale", region: "Testa e collo" },
  // Spalla / Arto superiore
  { code: "SH1", label: "Lussazione gleno-omerale", region: "Spalla e arto superiore" },
  { code: "SH2", label: "Lesione cuffia dei rotatori", region: "Spalla e arto superiore" },
  { code: "AC1", label: "Lesione acromion-claveare", region: "Spalla e arto superiore" },
  { code: "AR1", label: "Frattura avambraccio", region: "Spalla e arto superiore" },
  { code: "WR1", label: "Distorsione polso", region: "Spalla e arto superiore" },
  { code: "HD1", label: "Frattura mano / dita", region: "Spalla e arto superiore" },
  // Tronco / Schiena
  { code: "LB1", label: "Lombalgia", region: "Tronco e schiena" },
  { code: "RB1", label: "Contusione / frattura costale", region: "Tronco e schiena" },
  { code: "AB1", label: "Stiramento muscolatura addominale", region: "Tronco e schiena" },
  // Anca / Inguine
  { code: "HP1", label: "Sindrome inguinale / pubalgia", region: "Anca e inguine" },
  { code: "HP2", label: "Lesione adduttori", region: "Anca e inguine" },
  { code: "HP3", label: "Lesione flessori dell'anca (ileopsoas)", region: "Anca e inguine" },
  { code: "HP4", label: "Borsite / conflitto femoro-acetabolare", region: "Anca e inguine" },
  // Coscia
  { code: "TH1", label: "Lesione ischiocrurali (hamstring)", region: "Coscia" },
  { code: "TH2", label: "Lesione quadricipite", region: "Coscia" },
  { code: "TH3", label: "Contusione coscia", region: "Coscia" },
  // Ginocchio
  { code: "KN1", label: "Lesione LCA (crociato anteriore)", region: "Ginocchio" },
  { code: "KN2", label: "Lesione LCM / LCL (collaterali)", region: "Ginocchio" },
  { code: "KN3", label: "Lesione meniscale", region: "Ginocchio" },
  { code: "KN4", label: "Tendinopatia rotulea", region: "Ginocchio" },
  { code: "KN5", label: "Sindrome femoro-rotulea", region: "Ginocchio" },
  // Gamba
  { code: "LG1", label: "Lesione gastrocnemio / soleo (polpaccio)", region: "Gamba" },
  { code: "LG2", label: "Periostite tibiale (shin splints)", region: "Gamba" },
  { code: "LG3", label: "Tendinopatia achillea", region: "Gamba" },
  { code: "LG4", label: "Frattura da stress (tibia)", region: "Gamba" },
  // Caviglia / Piede
  { code: "AN1", label: "Distorsione caviglia (laterale)", region: "Caviglia e piede" },
  { code: "AN2", label: "Distorsione alta (sindesmosi)", region: "Caviglia e piede" },
  { code: "FT1", label: "Fascite plantare", region: "Caviglia e piede" },
  { code: "FT2", label: "Frattura metatarso", region: "Caviglia e piede" },
  { code: "FT3", label: "Lesione legamento deltoideo", region: "Caviglia e piede" },
  // Generale / Medica
  { code: "ME1", label: "Sindrome influenzale", region: "Generale / medica" },
  { code: "ME2", label: "Gastroenterite", region: "Generale / medica" },
  { code: "ME3", label: "Affaticamento / overreaching", region: "Generale / medica" },
  { code: "ME4", label: "Disidratazione", region: "Generale / medica" },
];

/** Regioni nell'ordine di comparsa (per gli optgroup della lista). */
export const OSICS_REGIONS: string[] = [...new Set(OSICS.map((o) => o.region))];

/** Stringa da memorizzare nel campo classificazione (codice · etichetta). */
export const osicsValue = (o: OsicsCode) => `${o.code} · ${o.label}`;
