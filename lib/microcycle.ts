import type { CalendarEvent, SessionType } from "./types";

// ============================================================================
// Logica microciclo: codifica MD (giorni rispetto alla partita) e carico.
// ============================================================================

/** Carico interno indicativo (AU) per tipo di seduta — guida la periodizzazione. */
export const TYPE_LOAD: Record<SessionType, number> = {
  partita: 100,
  campo: 70,
  palestra: 50,
  recupero: 22,
  video: 8,
  medico: 10,
  riposo: 0,
};

const DAY = 86400000;
const toMs = (iso: string) => Date.parse(iso + "T00:00:00");

/** Codifica MD di un giorno rispetto alle partite presenti negli eventi. */
export function mdCode(dayIso: string, matchDates: string[]): { code: string; offset: number } {
  const day = toMs(dayIso);
  const matches = matchDates.map(toMs).sort((a, b) => a - b);
  if (matches.includes(day)) return { code: "MD", offset: 0 };

  let nextDiff = Infinity;
  let prevDiff = Infinity;
  for (const m of matches) {
    if (m > day) nextDiff = Math.min(nextDiff, Math.round((m - day) / DAY));
    if (m < day) prevDiff = Math.min(prevDiff, Math.round((day - m) / DAY));
  }
  // Giorni subito dopo gara → MD+ ; altrimenti conto alla rovescia verso la prossima
  if (prevDiff <= 2 && prevDiff < nextDiff) return { code: `MD+${prevDiff}`, offset: prevDiff };
  if (nextDiff !== Infinity) return { code: `MD-${nextDiff}`, offset: -nextDiff };
  if (prevDiff !== Infinity) return { code: `MD+${prevDiff}`, offset: prevDiff };
  return { code: "—", offset: 99 };
}

/** Colore della codifica MD (rosso gara → verde lontano). */
export function mdColor(offset: number): string {
  if (offset === 0) return "#dc2626"; // MD
  if (offset > 0) return "#0891b2"; // MD+ (recupero)
  const o = Math.abs(offset);
  if (o === 1) return "#16a34a"; // MD-1 rifinitura
  if (o === 2) return "#65a30d";
  if (o === 3) return "#d97706";
  if (o === 4) return "#ea580c";
  return "#7c3aed";
}

export function dayLoad(events: CalendarEvent[]): number {
  return events.reduce((s, e) => s + (TYPE_LOAD[e.sessionType] ?? 0), 0);
}
