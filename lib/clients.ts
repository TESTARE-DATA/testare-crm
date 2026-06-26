import type { Client } from "./types";

// ============================================================================
// Clienti (società sportive). I colori brandizzano l'app quando si entra
// nel cliente specifico.
// ============================================================================

export const CLIENTS: Client[] = [
  {
    id: "torino",
    name: "Torino FC",
    shortName: "Torino",
    city: "Torino",
    foundedYear: 1906,
    logo: "/logos/torino.png",
    colors: {
      primary: "#7A1228",
      primaryDark: "#4F0C1B",
      accent: "#C9A24B",
      onPrimary: "#FFFFFF",
      soft: "#F3E7EA",
    },
    status: "attivo",
    plan: "Elite",
    since: "2025-08-01",
    staff: [
      { name: "Marco Rossi", role: "Head of Performance", email: "m.rossi@torinofc.it", phone: "+39 011 1900001" },
      { name: "Luca Bianchi", role: "Match Analyst", email: "l.bianchi@torinofc.it", phone: "+39 011 1900002" },
      { name: "Dott. Verdi", role: "Responsabile Medico", email: "med@torinofc.it", phone: "+39 011 1900003" },
      { name: "Stefano Riva", role: "Preparatore Atletico", email: "s.riva@torinofc.it", phone: "+39 011 1900004" },
      { name: "Giulio Ferri", role: "Fisioterapista", email: "g.ferri@torinofc.it", phone: "+39 011 1900005" },
      { name: "Davide Lombardi", role: "Team Manager", email: "d.lombardi@torinofc.it", phone: "+39 011 1900006" },
    ],
  },
  {
    id: "empoli",
    name: "Empoli FC",
    shortName: "Empoli",
    city: "Empoli",
    foundedYear: 1920,
    logo: "/logos/empoli.svg",
    colors: {
      primary: "#1E6FB8",
      primaryDark: "#10487A",
      accent: "#0B2C4D",
      onPrimary: "#FFFFFF",
      soft: "#E6F0F9",
    },
    status: "attivo",
    plan: "Pro",
    since: "2026-01-15",
    staff: [
      { name: "Andrea Conti", role: "Preparatore Atletico", email: "a.conti@empolifc.com", phone: "+39 0571 700001" },
      { name: "Sara Neri", role: "Data Analyst", email: "s.neri@empolifc.com", phone: "+39 0571 700002" },
    ],
  },
];

export function getClient(clientId: string): Client | undefined {
  return CLIENTS.find((c) => c.id === clientId);
}
