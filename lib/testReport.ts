// ============================================================================
// Parser del report "Analisi della valutazione neuromuscolare" (TESTÀRE).
// Il report HTML è generato da software con marcatori macchina espliciti
// (data-athlete-section, data-session-idx/-date, data-sort-value, classi
// .font-bold.tabular-nums e .perc-badge): l'estrazione è quindi STRUTTURALE,
// mai basata sul testo "appiattito". Funzione PURA (gira in Node e nel browser
// tramite node-html-parser), così è testabile sul file reale prima dell'uso.
//
// Estrae, per atleta:
//   - i KPI 0–100 (forza/potenza/reattività/simmetria + P-Index) dalla tabella
//     squadra → alimentano il radar dell'app;
//   - le sessioni datate con il dettaglio dei test (nome, valore, unità,
//     percentile) → costruiscono lo storico per atleta.
// ============================================================================

import { parse, type HTMLElement } from "node-html-parser";
import type { TestKpi } from "./types";

export interface ParsedTest {
  name: string;
  value: string; // valore corrente ("44.4" o "147/131" per bilaterale)
  unit: string;
  percentile: number | null;
}
export interface ParsedSession {
  date: string | null; // ISO YYYY-MM-DD
  label: string; // data originale com'era nel file (es. "13/05/26")
  active: boolean;
  tests: ParsedTest[];
}
// Un valore può mancare nel report (cella vuota = test non eseguito): lo teniamo
// null e lo segnaliamo come "n/d" nella verifica, senza scartare l'intero atleta.
export type ParsedKpi = TestKpi;
export interface ParsedAthlete {
  reportName: string; // nome come nel report (es. "CEESAY JOSEPH")
  kpi: ParsedKpi | null;
  category: string | null;
  sessions: ParsedSession[]; // dalla più recente alla più vecchia
}
export interface ParsedReport {
  ok: boolean;
  error?: string;
  reportDate: string | null;
  athletes: ParsedAthlete[];
}

// gg/mm/aa(aa) → ISO YYYY-MM-DD
function toISO(d: string): string | null {
  const m = d.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0"), mon = m[2].padStart(2, "0");
  let y = m[3];
  if (y.length === 2) y = "20" + y;
  return `${y}-${mon}-${day}`;
}

const txt = (el: HTMLElement | null | undefined) => (el ? el.text.replace(/\s+/g, " ").trim() : "");
/** Valore numerico "puro" da uno span valore: solo i text-node diretti (esclude
 *  lo span figlio dell'unità e l'eventuale freccia di trend). */
function pureValue(el: HTMLElement): string {
  const direct = el.childNodes.filter((n) => n.nodeType === 3).map((n) => n.text).join("");
  return direct.replace(/[↑↓→\s]/g, "").trim();
}
function isHidden(el: HTMLElement, stop: HTMLElement): boolean {
  let n: HTMLElement | null = el;
  while (n && n !== stop) {
    const style = (n.getAttribute("style") || "").replace(/\s+/g, "");
    if (/display:none|visibility:hidden/.test(style)) return true;
    const cls = n.getAttribute("class") || "";
    if (/\bhidden\b/.test(cls)) return true;
    n = n.parentNode as HTMLElement | null;
  }
  return false;
}

function extractTeamKpi(root: HTMLElement): Map<string, { kpi: ParsedKpi; category: string | null }> {
  const out = new Map<string, { kpi: ParsedKpi; category: string | null }>();
  const tables = root.querySelectorAll("table");
  const team = tables.find((t) => /Reattività/i.test(t.text) && /P-?Index/i.test(t.text) && t.querySelector("th"));
  if (!team) return out;
  // Indici colonna dagli header.
  const headers = team.querySelectorAll("th").map((th) => txt(th).toLowerCase());
  const col = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const ci = { name: col(/atleta/), cat: col(/cat/), forza: col(/forza/), potenza: col(/potenza/), reatt: col(/reatt/), simm: col(/simm/), pindex: col(/p.?index/) };
  for (const tr of team.querySelectorAll("tr")) {
    const cells = tr.querySelectorAll("td");
    if (cells.length === 0) continue;
    const cellVal = (i: number): string => {
      if (i < 0 || i >= cells.length) return "";
      const c = cells[i];
      const ds = c.getAttribute("data-sort-value");
      return (ds != null && ds !== "" ? ds : txt(c));
    };
    const name = cellVal(ci.name).trim();
    if (!name || !/[A-Za-zÀ-ÿ]/.test(name)) continue;
    const num = (i: number): number | null => { const raw = cellVal(i).replace(/[^\d-]/g, ""); if (raw === "") return null; const n = parseInt(raw, 10); return Number.isFinite(n) ? n : null; };
    const kpi: ParsedKpi = { forza: num(ci.forza), potenza: num(ci.potenza), reattivita: num(ci.reatt), simmetria: num(ci.simm), pIndex: num(ci.pindex) };
    // Includi l'atleta se ha un nome e almeno un valore KPI (i mancanti restano null).
    if ([kpi.forza, kpi.potenza, kpi.reattivita, kpi.simmetria, kpi.pIndex].some((v) => v != null)) {
      out.set(name.toUpperCase(), { kpi, category: ci.cat >= 0 ? cellVal(ci.cat) : null });
    }
  }
  return out;
}

export function parseTestReport(html: string): ParsedReport {
  let root: HTMLElement;
  try {
    root = parse(html);
  } catch {
    return { ok: false, error: "File non leggibile come HTML.", reportDate: null, athletes: [] };
  }
  const teamKpi = extractTeamKpi(root);
  const sections = root.querySelectorAll("[data-athlete-section]");
  if (sections.length === 0) {
    return { ok: false, error: "Non sembra un report di valutazione neuromuscolare TESTÀRE (struttura non riconosciuta).", reportDate: null, athletes: [] };
  }

  const athletes: ParsedAthlete[] = [];
  let maxDateISO: string | null = null;

  for (const sec of sections) {
    const reportName = txt(sec.querySelector("h1"));
    if (!reportName) continue;

    // Mappa idx → data dalle navi di sessione.
    const idxDate = new Map<string, string>();
    for (const nav of sec.querySelectorAll("[data-session-date]")) {
      const idx = nav.getAttribute("data-session-idx");
      const date = (nav.getAttribute("data-session-date") || "").trim();
      if (idx != null && date && !idxDate.has(idx)) idxDate.set(idx, date);
    }

    // Raccogli le tabelle di dettaglio (con percentili) raggruppate per sessione.
    const detailTables = sec.querySelectorAll("table").filter((t) => t.querySelector(".perc-badge"));
    const bySession = new Map<string, { active: boolean; tests: ParsedTest[] }>();
    for (const tb of detailTables) {
      const holder = tb.closest("[data-session-idx]");
      const idx = holder ? holder.getAttribute("data-session-idx") ?? "0" : "0";
      const active = holder ? !isHidden(holder, sec) : true;
      const bucket = bySession.get(idx) ?? { active, tests: [] };
      bucket.active = bucket.active || active;
      for (const tr of tb.querySelectorAll("tr")) {
        const firstTd = tr.querySelector("td");
        const valEl = tr.querySelector(".font-bold.tabular-nums");
        if (!firstTd || !valEl) continue;
        const name = txt(firstTd);
        const value = pureValue(valEl);
        if (!name || !value || !/[\d]/.test(value)) continue;
        const unit = txt(valEl.querySelector("span"));
        const percRaw = txt(tr.querySelector(".perc-badge")).replace(/[^\d]/g, "");
        const percentile = percRaw ? parseInt(percRaw, 10) : null;
        if (!bucket.tests.some((t) => t.name === name)) bucket.tests.push({ name, value, unit, percentile });
      }
      bySession.set(idx, bucket);
    }

    const rawSessions: ParsedSession[] = [...bySession.entries()]
      .map(([idx, b]) => {
        const label = idxDate.get(idx) ?? "";
        const date = label ? toISO(label) : null;
        if (date && (!maxDateISO || date > maxDateISO)) maxDateISO = date;
        return { date, label, active: b.active, tests: b.tests };
      })
      .filter((s) => s.tests.length > 0);
    // Dedup per data (il report a volte ripete la stessa sessione): tieni la più
    // completa e marca attiva se una qualsiasi lo è.
    const byDate = new Map<string, ParsedSession>();
    for (const s of rawSessions) {
      const key = s.date ?? s.label ?? "?";
      const ex = byDate.get(key);
      if (!ex) byDate.set(key, s);
      else { if (s.tests.length > ex.tests.length) ex.tests = s.tests; ex.active = ex.active || s.active; }
    }
    const sessions = [...byDate.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

    const team = teamKpi.get(reportName.toUpperCase());
    athletes.push({ reportName, kpi: team?.kpi ?? null, category: team?.category ?? null, sessions });
  }

  // Fallback data: una sessione senza data (atleta con un solo test, niente nav)
  // eredita la data del report.
  for (const a of athletes) {
    for (const s of a.sessions) {
      if (!s.date && s.active && maxDateISO) { s.date = maxDateISO; s.label = s.label || maxDateISO; }
    }
  }

  return { ok: true, reportDate: maxDateISO, athletes };
}

// ---- abbinamento nome report → atleta in rosa ------------------------------
export interface RosterLite { id: string; firstName: string; lastName: string; shirtNumber: number }
const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

/** Abbina un nome del report (di solito "COGNOME NOME") a un atleta della rosa.
 *  Prova nome+cognome in qualsiasi ordine, poi il cognome (anche composto). */
export function matchAthlete(reportName: string, roster: RosterLite[]): string | null {
  const n = normName(reportName);
  if (!n) return null;
  const toks = n.split(" ").filter(Boolean);
  let a = roster.find((r) => { const fl = normName(`${r.firstName} ${r.lastName}`), lf = normName(`${r.lastName} ${r.firstName}`); return n === fl || n === lf; });
  if (a) return a.id;
  a = roster.find((r) => { const lnToks = normName(r.lastName).split(" "); return lnToks.length > 0 && lnToks.every((t) => toks.includes(t)); });
  return a ? a.id : null;
}
