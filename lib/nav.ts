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

export type NavItem = NavLeaf | NavGroup;

export function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}

export const NAV: NavItem[] = [
  { slug: "", label: "Panoramica", icon: "home", description: "Riepilogo del cliente" },
  { slug: "rosa", label: "Rosa", icon: "users", description: "Atleti, anagrafica e KPI" },
  { slug: "readiness", label: "Readiness", icon: "trend", description: "Prontezza da questionario di benessere" },
  { slug: "calendario", label: "Calendario", icon: "calendar", description: "30 giorni · sedute ed eventi" },
  { slug: "programmazione", label: "Piano di Allenamento", icon: "target", description: "Periodizzazione: macrociclo, mesocicli, microcicli e monitoraggio" },
  { slug: "registro-presenze", label: "Registro Presenze", icon: "clipboard", description: "Presenze per seduta e statistiche per obiettivo" },
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
    description: "Carico, test e tracking GPS",
    children: [
      { slug: "carico", label: "Carico", icon: "load", description: "Carico interno ed esterno" },
      { slug: "test", label: "Test e misurazioni", icon: "stopwatch", description: "Valutazione neuromuscolare TESTÀRE e misurazioni interne" },
      { slug: "gps", label: "GPS", icon: "live", description: "Analisi dati GPS" },
    ],
  },
  { slug: "rd", label: "R&D", icon: "sparkle", description: "Data Intelligence: correlazioni e reportistica" },
  { slug: "campionato", label: "Campionato", icon: "trophy", description: "Classifica e risultati live" },
  { slug: "importa-dati", label: "Importa Dati", icon: "upload", description: "Import da GPS, CSV, dispositivi" },
];

/** Tutte le foglie navigabili (utile per panoramica/scorciatoie). */
export const SECTION_LEAVES: NavLeaf[] = NAV.flatMap((i) =>
  isGroup(i) ? i.children : i.slug === "" ? [] : [i],
);

export function sectionHref(clientId: string, slug: string): string {
  return slug ? `/clienti/${clientId}/${slug}` : `/clienti/${clientId}`;
}
