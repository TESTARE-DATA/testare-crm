// ============================================================================
// Estrazione della DATA dal contenuto di un file (i documenti TESTÀRE la
// riportano sempre dentro). Usato in Archivio Test e referti Area Medica.
// ============================================================================

const MONTHS_IT: Record<string, number> = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

/** Cerca una data (ISO yyyy-mm-dd) nel testo. Supporta ISO, gg/mm/aaaa, "gg mese aaaa". */
export function extractDateFromText(raw: string): string | null {
  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  if (dmy) { const d = +dmy[1], mo = +dmy[2]; if (d <= 31 && mo <= 12) return `${dmy[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
  const it = raw.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/i);
  if (it) { const mo = MONTHS_IT[it[2].toLowerCase()]; return `${it[3]}-${String(mo).padStart(2, "0")}-${String(+it[1]).padStart(2, "0")}`; }
  return null;
}

/** Estrae la data da un data-URL (decodifica il base64 e cerca nel contenuto). */
export function extractDateFromDataUrl(dataUrl: string): string | null {
  try {
    return extractDateFromText(atob(dataUrl.split(",")[1] ?? ""));
  } catch {
    return null;
  }
}
