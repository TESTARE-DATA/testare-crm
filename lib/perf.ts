import type { PerfCluster, PerfTier, PhysicalKpi, PerfProfile } from "./types";

// ============================================================================
// Logica del profilo performance TESTÀRE (metodologia del Season Report).
// Tutti i valori sono PERCENTILI 0–100 (°).
// ============================================================================

/** Smallest Worthwhile Change sul P-Index (Hopkins 2006): ±5 punti. */
export const SWC = 5;

export const KPI_KEYS: (keyof PhysicalKpi)[] = ["forza", "potenza", "reattivita", "simmetria"];
export const KPI_LABEL: Record<keyof PhysicalKpi, string> = {
  forza: "Forza",
  potenza: "Potenza",
  reattivita: "Reattività",
  simmetria: "Simmetrie",
};
/** Cosa misura ogni dimensione (testo esatto dal Season Report). */
export const KPI_BASIS: Record<keyof PhysicalKpi, string> = {
  forza: "1RM Back Squat · 1RM/peso · IMTP",
  potenza: "CMJ height · peak power · profilo F–V",
  reattivita: "RSI Drop Jump · RSI Single-Leg DJ",
  simmetria: "LSI per task · magnitude + direction (Bishop 2021)",
};
/** Livello di evidenza (CEBM) per dimensione. */
export const KPI_CEBM: Record<keyof PhysicalKpi, string> = {
  forza: "CEBM 1a–1b",
  potenza: "CEBM 1a",
  reattivita: "CEBM 1b–2b",
  simmetria: "CEBM —",
};

// Tier (fasce P-Index)
export function tierOf(pIndex: number): PerfTier {
  if (pIndex > 80) return "Elite";
  if (pIndex >= 60) return "Buono";
  if (pIndex >= 45) return "Adeguato";
  return "Critico";
}

export const TIER_META: Record<PerfTier, { color: string; bg: string; range: string }> = {
  Elite: { color: "#0891b2", bg: "rgba(8,145,178,.10)", range: ">80°" },
  Buono: { color: "#16a34a", bg: "rgba(22,163,74,.10)", range: "60–80°" },
  Adeguato: { color: "#d97706", bg: "rgba(217,119,6,.10)", range: "45–60°" },
  Critico: { color: "#dc2626", bg: "rgba(220,38,38,.10)", range: "<45°" },
};

// Deficit flags (Bahr 2016): screening, non predittivo.
// F1=Forza<50 · F2=Potenza<50 · F3=Reattività<50 · F4=Simmetrie<70 · F5=polarizzazione Δ>35
export interface Flag {
  code: string;
  label: string;
}
export function flagsOf(k: PhysicalKpi): Flag[] {
  const f: Flag[] = [];
  if (k.forza < 50) f.push({ code: "F1", label: "Forza < 50°" });
  if (k.potenza < 50) f.push({ code: "F2", label: "Potenza < 50°" });
  if (k.reattivita < 50) f.push({ code: "F3", label: "Reattività < 50°" });
  if (k.simmetria < 70) f.push({ code: "F4", label: "Simmetrie < 70°" });
  const dims = [k.forza, k.potenza, k.reattivita];
  if (Math.max(...dims) - Math.min(...dims) > 35) f.push({ code: "F5", label: "Polarizzazione Δ > 35°" });
  return f;
}

// Cluster di lavoro (profilo neuromuscolare dominante)
export function clusterOf(k: PhysicalKpi): PerfCluster {
  const below = [k.forza, k.potenza, k.reattivita, k.simmetria].filter((v) => v < 55).length;
  if (below >= 2) return "Deficit multipli";
  const { forza: F, potenza: P, reattivita: R } = k;
  const max = Math.max(F, P, R);
  const spread = max - Math.min(F, P, R);
  if (spread <= 12) return "Bilanciato";
  if (F === max) return "Forza-dom";
  if (P === max) return "Potenza-dom";
  return "Reattività-dom";
}

export const CLUSTER_META: Record<PerfCluster, { obiettivo: string; metodo: string }> = {
  "Forza-dom": {
    obiettivo: "Convertire la forza in potenza esplosiva",
    metodo: "Ballistico 40–60% 1RM · jump squat · contrast · RFD isometrico",
  },
  "Potenza-dom": {
    obiettivo: "Ottimizzare ciclo elastico + transfer sport-specifico",
    metodo: "Pliometria reattiva · contatti <200ms · drop jump · sprint assistito",
  },
  "Reattività-dom": {
    obiettivo: "Alzare il soffitto di forza massimale",
    metodo: "Forza 80–90% 1RM · IMTP · back squat · triple-extension",
  },
  Bilanciato: {
    obiettivo: "Mantenere simmetria, spingere sul transfer cross-domain",
    metodo: "Periodizzazione ondulata · alternanza 3:1 forza/potenza",
  },
  "Deficit multipli": {
    obiettivo: "Ricostruire la base neuromuscolare prima di intensificare",
    metodo: "Blocco remediale 8–12 sett. · forza generale · controllo motorio",
  },
};

/** Δ rispetto alla sessione precedente, con lettura SWC. */
export function delta(profile: PerfProfile, key: keyof PhysicalKpi | "pIndex") {
  const cur = profile[key];
  const prev = profile.prev[key];
  const d = cur - prev;
  return { value: d, significant: Math.abs(d) >= SWC };
}
