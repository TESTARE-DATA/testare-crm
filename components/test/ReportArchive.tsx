"use client";

import { useLocalCollection, newId } from "@/lib/store";
import { putFile, getFile, deleteFile } from "@/lib/fileStore";
import { extractDateFromDataUrl } from "@/lib/fileDate";
import { Icon } from "@/components/Icon";

// ============================================================================
// Archivio file report (HTML/PDF) — tipi e helper condivisi tra le aree di
// "Test e misura" (Performance ha la sua variante con parsing; Area Medica e
// Direzione Sportiva usano l'archivio generico qui sotto). I file veri stanno in
// IndexedDB (fileStore); in localStorage solo i metadati.
// ============================================================================

// url  → file pubblico (card demo) o legacy data-URL già in localStorage.
// hasFile → il contenuto reale è in IndexedDB con chiave = id (vedi fileStore).
export interface ReportFile { id: string; name: string; date: string; kind: "html" | "pdf"; url?: string; hasFile?: boolean; demo?: boolean }

/** Apre il file in una nuova scheda. Il blob (da IndexedDB o data-URL legacy) non è
 *  navigabile direttamente → lo apro sempre come blob URL.
 *
 *  SICUREZZA: i report HTML sono file caricati dall'utente (contenuto non fidato:
 *  potrebbero contenere <script> malevoli). NON vanno aperti nella nostra origin,
 *  altrimenti uno script potrebbe leggere localStorage/IndexedDB/cookie e chiamare
 *  le server action. Li isolo quindi in un <iframe sandbox> SENZA allow-same-origin:
 *  l'iframe gira con un'origin opaca, gli script del report (es. Chart.js) continuano
 *  a funzionare ma non possono toccare i dati della piattaforma. I PDF, resi dal
 *  viewer già isolato del browser, si aprono direttamente. */
export function openReport(file: ReportFile) {
  const openHtmlSandboxed = (src: string, revoke?: () => void) => {
    const w = window.open("", "_blank");
    if (!w) { revoke?.(); return; }
    const doc = w.document;
    doc.title = file.name || "Report";
    const style = doc.createElement("style");
    style.textContent = "html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}";
    doc.head.appendChild(style);
    const frame = doc.createElement("iframe");
    // allow-scripts serve a Chart.js; NON aggiungere allow-same-origin (romperebbe l'isolamento).
    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-modals allow-forms");
    frame.src = src;
    doc.body.appendChild(frame);
    if (revoke) w.setTimeout(revoke, 60_000);
  };
  const openBlob = (b: Blob) => {
    const u = URL.createObjectURL(b);
    if (file.kind === "pdf") {
      window.open(u, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(u), 60_000);
    } else {
      openHtmlSandboxed(u, () => URL.revokeObjectURL(u));
    }
  };
  if (file.hasFile) {
    getFile(file.id).then((b) => { if (b) openBlob(b); }).catch(() => {});
    return;
  }
  if (!file.url) return;
  if (file.url.startsWith("data:")) {
    fetch(file.url).then((r) => r.blob()).then(openBlob).catch(() => {});
    return;
  }
  // file pubblico (demo): i PDF direttamente, gli HTML comunque isolati.
  if (file.kind === "pdf") window.open(file.url, "_blank", "noopener");
  else openHtmlSandboxed(file.url);
}

export function FileBtn({ kind, file }: { kind: "html" | "pdf"; file?: ReportFile }) {
  const label = kind.toUpperCase();
  const icon = kind === "pdf" ? "clipboard" : "live";
  // Nessun file di questo formato → tasto spento (non cliccabile).
  if (!file) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[13px] font-semibold text-muted-2 opacity-50" title={`Nessun file ${label}`}>
        <Icon name={icon} size={14} /> {label}
      </span>
    );
  }
  // File presente ma senza contenuto apribile (salvataggio non riuscito):
  // illuminato ma non apribile.
  if (!file.hasFile && !file.url) {
    return (
      <span className="brand-soft-bg brand-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold" title="File non salvato — ricaricalo per aprirlo">
        <Icon name={icon} size={14} /> {label}
      </span>
    );
  }
  // File disponibile → illuminato e cliccabile: apre il file annesso.
  return (
    <button onClick={() => openReport(file)} className="brand-bg brand-on flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-transform hover:scale-[1.03]" title={`Apri il file ${label}`}>
      <Icon name={icon} size={14} /> {label}
    </button>
  );
}

export function fmtMonth(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

/** Nome pulito dal filename (senza estensione/date/separatori). */
export function cleanName(filename: string, fallback: string): string {
  const base = filename.replace(/\.(html?|pdf)$/i, "")
    .replace(/\b\d{1,2}[/.\-_]\d{1,2}[/.\-_]20\d{2}\b/g, "")
    .replace(/\b20\d{2}[/.\-_]\d{1,2}[/.\-_]\d{1,2}\b/g, "")
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base.length >= 3 ? base : fallback;
}

// ---- Archivio generico (upload → IndexedDB, lista per data) ------------------
export function ReportArchive({ collection, clientLogo, clientName, title, hint, seed = [], defaultName }: {
  collection: string;      // chiave localStorage dei metadati (es. "test-reports-medica:<clientId>")
  clientLogo: string;
  clientName: string;
  title: string;           // titolo card di sezione
  hint: string;            // testo esplicativo sotto il dropzone
  seed?: ReportFile[];     // eventuali report di esempio (demo)
  defaultName: string;     // nome usato quando il filename non è leggibile
}) {
  const { items, add, remove } = useLocalCollection<ReportFile>(collection);
  const all = [...items, ...seed].sort((a, b) => b.date.localeCompare(a.date));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        const date = extractDateFromDataUrl(url) ?? new Date().toISOString().slice(0, 10);
        const id = newId("rep");
        const kind: "html" | "pdf" = /\.pdf$/i.test(f.name) ? "pdf" : "html";
        const meta = { id, name: cleanName(f.name, defaultName), date, kind };
        putFile(id, f).then(() => add({ ...meta, hasFile: true })).catch(() => add(meta));
      };
      reader.readAsDataURL(f);
    });
  };

  // raggruppa per (data + nome): un gruppo = un report con i suoi formati
  const groups = new Map<string, ReportFile[]>();
  for (const r of all) {
    const k = `${r.date}__${r.name}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  return (
    <div>
      <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-medium text-muted transition-colors hover:border-[var(--brand-primary)] hover:text-foreground">
        <Icon name="upload" size={18} /> Carica un report (HTML o PDF)
        <input type="file" accept=".html,.htm,application/pdf" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </label>
      <p className="mb-5 text-center text-[12px] text-muted-2">{hint}</p>

      {groups.size === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="brand-soft-bg brand-text flex h-12 w-12 items-center justify-center rounded-xl"><Icon name="clipboard" size={22} /></span>
          <p className="mt-1 text-sm font-semibold">Nessun report ancora</p>
          <p className="max-w-md text-[13px] text-muted">Carica qui i report {title.toLowerCase()}: HTML interattivo e/o PDF. Restano salvati e apribili in un clic.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...groups.entries()].map(([k, files]) => {
            const r = files[0];
            const html = files.find((f) => f.kind === "html");
            const pdf = files.find((f) => f.kind === "pdf");
            return (
              <div key={k} className="card brand-topline flex flex-wrap items-center gap-4 overflow-hidden p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border" style={{ backgroundColor: "var(--brand-soft)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clientLogo} alt={clientName} className="h-9 w-9 object-contain" />
                </span>
                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold leading-tight">{r.name}</span>
                    <span className="brand-soft-bg brand-text inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"><Icon name="calendar" size={11} /> {fmtMonth(r.date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-2">
                    <span className="uppercase tracking-wide">Analisi a cura di</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/testare-logo.png" alt="TESTÀRE" className="h-[13px] w-auto" />
                    {r.demo && <span>· esempio</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileBtn kind="html" file={html} />
                  <FileBtn kind="pdf" file={pdf} />
                  {!r.demo && <button onClick={() => files.forEach((f) => { remove(f.id); if (f.hasFile) deleteFile(f.id).catch(() => {}); })} className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-2 transition-colors hover:border-red-200 hover:text-red-600" title="Elimina"><span className="text-[13px]">✕</span></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
