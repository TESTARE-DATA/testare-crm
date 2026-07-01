// ============================================================================
// Navigazione delle sezioni di un cliente.
// Le voci possono essere singole oppure gruppi con sotto-voci (es. Area Tecnica).
// ============================================================================

export interface NavLeaf {
  slug: string; // segmento (può contenere "/", es. "area-tecnica/campo-live")
  label: string;
  icon: string;
  description: string;
}

export interface NavGroup {
  group: string;
  slug: string; // base del gruppo (landing)
  icon: string;
  description: string;
  children: NavLeaf[];
}

/** Intestazione di macro-dominio nel menu (solo etichetta, non navigabile). */
export interface NavHeader {
  header: string;
}

export type NavItem = NavLeaf | NavGroup | NavHeader;

export function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}
export function isHeader(item: NavItem): item is NavHeader {
  return (item as NavHeader).header !== undefined;
}

export const NAV: NavItem[] = [
  { header: "Squadra" },
  { slug: "", label: "Panoramica", icon: "home", description: "Riepilogo del cliente" },
  { slug: "campionato", label: "Campionato", icon: "trophy", description: "Classifica e risultati live" },
  { slug: "rosa", label: "Rosa", icon: "users", description: "Atleti, anagrafica e KPI" },
  { slug: "calendario", label: "Calendario", icon: "calendar", description: "30 giorni · sedute ed eventi" },
  { slug: "programmazione", label: "Piano di Allenamento", icon: "target", description: "Periodizzazione: macrociclo, mesocicli, microcicli e monitoraggio" },
  { slug: "readiness", label: "Readiness", icon: "trend", description: "Prontezza da questionario di benessere" },
  { slug: "test", label: "Test e misura", icon: "stopwatch", description: "Performance, area medica, direzione sportiva e misure interne" },
  {
    group: "Registro Attività",
    slug: "registro-attivita",
    icon: "clipboard",
    description: "Presenze atleti e storico degli allenamenti svolti",
    children: [
      { slug: "registro-attivita/presenze", label: "Presenze atleti", icon: "users", description: "Presenza per atleta, carico assorbito e statistiche" },
      { slug: "registro-attivita/allenamenti-svolti", label: "Allenamenti svolti", icon: "clipboard", description: "Storico delle sedute svolte, per tipo e obiettivo" },
    ],
  },
  {
    group: "Area Tecnica",
    slug: "area-tecnica",
    icon: "pitch",
    description: "Campo: esercitazioni e template tattici",
    children: [
      { slug: "area-tecnica/campo-live", label: "Campo Live", icon: "live", description: "Editor campo interattivo" },
      { slug: "area-tecnica/esercitazioni", label: "Esercitazioni", icon: "pitch", description: "Esercizi tattici di campo" },
      { slug: "area-tecnica/template", label: "Template", icon: "layers", description: "Sedute di campo" },
    ],
  },
  {
    group: "Area Performance",
    slug: "preparazione-atletica",
    icon: "dumbbell",
    description: "Palestra: forza, potenza, prevenzione",
    children: [
      { slug: "preparazione-atletica/esercizi", label: "Esercizi", icon: "dumbbell", description: "Esercizi di preparazione atletica" },
      { slug: "preparazione-atletica/template", label: "Template", icon: "layers", description: "Sedute di palestra" },
    ],
  },
  {
    group: "Area Medica",
    slug: "area-medica",
    icon: "medical",
    description: "Cartelle cliniche, presa in carico e riabilitazione",
    children: [
      { slug: "area-medica/overview", label: "Overview", icon: "users", description: "Tutti gli atleti con stato clinico" },
      { slug: "area-medica/presa-in-carico", label: "Presa in carico", icon: "clipboard", description: "Anamnesi, diagnosi, prognosi e prescrizione" },
      { slug: "area-medica/diario", label: "Diario riabilitativo", icon: "pulse", description: "Scheda del medico, sedute e riabilitazione" },
      { slug: "area-medica/storico", label: "Storico infortuni", icon: "calendar", description: "Archivio stagionale degli infortuni conclusi" },
      { slug: "area-medica/esercizi-trattamenti", label: "Esercizi e trattamenti", icon: "dumbbell", description: "Libreria riabilitativa" },
      { slug: "area-medica/template", label: "Template", icon: "layers", description: "Protocolli riabilitativi" },
    ],
  },
  {
    group: "Data Analysis",
    slug: "data-analysis",
    icon: "chart",
    description: "Tutti i parametri raccolti sull'atleta: carico, cuore, GPS e test",
    children: [
      { slug: "carico", label: "Carico", icon: "load", description: "Carico interno: sRPE e RPE degli allenamenti, carico settimanale" },
      { slug: "cardiofrequenzimetro", label: "Cardiofrequenzimetro", icon: "pulse", description: "Frequenza cardiaca, TRIMP e tempo nelle zone HR" },
      { slug: "gps", label: "GPS", icon: "live", description: "Carico esterno: distanza, alta velocità, sprint, PlayerLoad" },
    ],
  },
  { slug: "rd", label: "R&D", icon: "sparkle", description: "Data Intelligence: correlazioni e reportistica" },
  { slug: "importa-dati", label: "Importa Dati", icon: "upload", description: "Import da GPS, CSV, dispositivi" },
];

/** Tutte le foglie navigabili (utile per panoramica/scorciatoie). */
export const SECTION_LEAVES: NavLeaf[] = NAV.flatMap((i) =>
  isHeader(i) ? [] : isGroup(i) ? i.children : i.slug === "" ? [] : [i],
);

export function sectionHref(clientId: string, slug: string): string {
  return slug ? `/clienti/${clientId}/${slug}` : `/clienti/${clientId}`;
}
