import type { SessionType } from "./types";

// Metadati condivisi dei tipi di seduta (colore + etichetta + icona).
export const SESSION_META: Record<SessionType, { label: string; color: string; icon: string }> = {
  campo: { label: "Campo", color: "#16a34a", icon: "live" },
  palestra: { label: "Palestra", color: "#7c3aed", icon: "dumbbell" },
  partita: { label: "Partita", color: "#dc2626", icon: "stopwatch" },
  recupero: { label: "Recupero", color: "#0891b2", icon: "load" },
  video: { label: "Sessione video", color: "#2563eb", icon: "chart" },
  medico: { label: "Medico", color: "#d97706", icon: "medical" },
  riposo: { label: "Riposo", color: "#94a3b8", icon: "home" },
};

export const SESSION_TYPES = Object.keys(SESSION_META) as SessionType[];
