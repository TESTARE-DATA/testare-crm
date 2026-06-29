"use client";

import { useMemo, useState } from "react";
import type { AthletePoint, Insight, MetricDef, MetricGroup } from "@/lib/intelligence";
import type { StaffMember, PlayerRole } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui";
import { InjuryPrognosis } from "@/components/rd/InjuryPrognosis";

// ---- Helpers statistici (puri, lato client) --------------------------------
function mean(a: number[]) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}
function strength(r: number) {
  const a = Math.abs(r);
  if (a >= 0.7) return "forte";
  if (a >= 0.4) return "moderata";
  if (a >= 0.2) return "debole";
  return "trascurabile";
}

const ROLE_COLOR: Record<PlayerRole, string> = {
  Portiere: "#d97706",
  Difensore: "#1e6fb8",
  Centrocampista: "#16a34a",
  Attaccante: "#dc2626",
};
const GROUP_ORDER: MetricGroup[] = ["Carico", "GPS", "Performance", "Antropometria", "Medica"];

interface SavedReport {
  id: string;
  type: string;
  title: string;
  date: string;
  recipients: string[];
  scope: string;
  lines: string[];
}

type Tab = "correlazioni" | "insight" | "prognosi" | "report";

export function DataIntelligence({
  clientName,
  metrics,
  matrix,
  insights,
  staff,
  projects,
}: {
  clientName: string;
  metrics: MetricDef[];
  matrix: AthletePoint[];
  insights: Insight[];
  staff: StaffMember[];
  projects: { title: string; area: string; status: string; owner: string }[];
}) {
  const [tab, setTab] = useState<Tab>("correlazioni");
  const [xKey, setXKey] = useState("strain");
  const [yKey, setYKey] = useState("injuryDays");

  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])), [metrics]);
  const xDef = byKey[xKey], yDef = byKey[yKey];

  const points = useMemo(
    () => matrix.map((p) => ({ x: p.v[xKey], y: p.v[yKey], name: p.name, role: p.role, injured: p.injured })),
    [matrix, xKey, yKey],
  );
  const r = useMemo(() => pearson(points.map((p) => p.x), points.map((p) => p.y)), [points]);

  return (
    <div>
      {/* Segmented control */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
        {([
          ["correlazioni", "chart", "Correlazioni"],
          ["insight", "sparkle", "Insight"],
          ["prognosi", "medical", "Prognosi"],
          ["report", "clipboard", "Report"],
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${tab === key ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}
          >
            <Icon name={icon} size={15} /> {label}
            {key === "insight" && insights.length > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 text-[10px] ${tab === key ? "bg-white/25" : "bg-amber-100 text-amber-700"}`}>{insights.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "correlazioni" && (
        <CorrelationLab
          metrics={metrics}
          points={points}
          r={r}
          xKey={xKey}
          yKey={yKey}
          xDef={xDef}
          yDef={yDef}
          setX={setXKey}
          setY={setYKey}
        />
      )}
      {tab === "insight" && <InsightsView insights={insights} projects={projects} />}
      {tab === "prognosi" && <InjuryPrognosis />}
      {tab === "report" && (
        <ReportBuilder
          clientName={clientName}
          matrix={matrix}
          metrics={metrics}
          insights={insights}
          staff={staff}
          corr={{ r, xDef, yDef, points }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Correlazioni
// ============================================================================
const PRESETS: { x: string; y: string; label: string }[] = [
  { x: "strain", y: "injuryDays", label: "Strain → Indisponibilità" },
  { x: "monotony", y: "asymmetry", label: "Monotonia → Asimmetria" },
  { x: "loadTot", y: "distanceTot", label: "Carico interno ↔ esterno" },
  { x: "age", y: "maxSpeed", label: "Età → Velocità max" },
  { x: "loadSpike", y: "injuryDays", label: "Picco carico → Indisponibilità" },
];

function CorrelationLab({
  metrics, points, r, xKey, yKey, xDef, yDef, setX, setY,
}: {
  metrics: MetricDef[];
  points: { x: number; y: number; name: string; role: PlayerRole; injured: boolean }[];
  r: number;
  xKey: string; yKey: string;
  xDef?: MetricDef; yDef?: MetricDef;
  setX: (k: string) => void; setY: (k: string) => void;
}) {
  const dir = r > 0 ? "positiva" : "negativa";
  const rTone = Math.abs(r) >= 0.7 ? "text-emerald-600" : Math.abs(r) >= 0.4 ? "text-amber-600" : "text-muted";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Controlli + scatter */}
      <div className="card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-end gap-3">
          <MetricSelect label="Asse X" metrics={metrics} value={xKey} onChange={setX} />
          <span className="pb-2 text-muted-2"><Icon name="link" size={16} /></span>
          <MetricSelect label="Asse Y" metrics={metrics} value={yKey} onChange={setY} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setX(p.x); setY(p.y); }}
              className="rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted transition-colors hover:border-foreground/25 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>

        <Scatter points={points} xLabel={xDef?.label ?? ""} yLabel={yDef?.label ?? ""} />

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
          {(Object.keys(ROLE_COLOR) as PlayerRole[]).map((role) => (
            <span key={role} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_COLOR[role] }} /> {role}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-bad" style={{ backgroundColor: "transparent" }} /> episodio medico</span>
        </div>
      </div>

      {/* Risultato */}
      <div className="space-y-4">
        <div className="card brand-topline p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Coefficiente di Pearson</div>
          <div className={`mt-1 text-5xl font-extrabold tracking-tight ${rTone}`}>{r >= 0 ? "+" : ""}{r.toFixed(2)}</div>
          <div className="mt-1 text-sm">
            Correlazione <b>{strength(r)}</b> <b>{dir}</b>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            {Math.abs(r) < 0.2 ? (
              <>Tra <b className="text-foreground">{xDef?.short}</b> e <b className="text-foreground">{yDef?.short}</b> non emerge una relazione lineare rilevante in questa rosa.</>
            ) : (
              <>
                All&apos;aumentare di <b className="text-foreground">{xDef?.short}</b>, <b className="text-foreground">{yDef?.short}</b> tende a{" "}
                {r > 0 ? "aumentare" : "diminuire"}.
              </>
            )}
          </p>
          <div className="mt-3 rounded-lg bg-background p-2.5 text-[11px] text-muted">
            n = {points.length} atleti · finestra di monitoraggio corrente.<br />
            <b>Correlazione ≠ causalità.</b> Usa come ipotesi, non come prova.
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Estremi su {xDef?.short}</div>
          <Extremes points={points} def={xDef} />
        </div>
      </div>
    </div>
  );
}

function MetricSelect({ label, metrics, value, onChange }: { label: string; metrics: MetricDef[]; value: string; onChange: (k: string) => void }) {
  return (
    <label className="flex-1 min-w-[180px]">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</span>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        {GROUP_ORDER.map((g) => (
          <optgroup key={g} label={g}>
            {metrics.filter((m) => m.group === g).map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Extremes({ points, def }: { points: { x: number; name: string }[]; def?: MetricDef }) {
  const sorted = [...points].sort((a, b) => b.x - a.x);
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();
  const fmt = (n: number) => `${n.toFixed(def?.decimals ?? 0)}${def?.unit ? ` ${def.unit}` : ""}`;
  return (
    <div className="space-y-2 text-[13px]">
      {top.map((p, i) => (
        <div key={`t${i}`} className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="text-[11px] font-bold text-muted-2">#{i + 1}</span> {p.name}</span>
          <b>{fmt(p.x)}</b>
        </div>
      ))}
      <div className="border-t border-border pt-2 text-[11px] text-muted-2">più bassi</div>
      {bottom.map((p, i) => (
        <div key={`b${i}`} className="flex items-center justify-between text-muted">
          <span>{p.name}</span><span>{fmt(p.x)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Scatter SVG con retta di regressione ----------------------------------
function Scatter({ points, xLabel, yLabel }: { points: { x: number; y: number; name: string; role: PlayerRole; injured: boolean }[]; xLabel: string; yLabel: string }) {
  const W = 640, H = 360, P = 44;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1, ySpan = yMax - yMin || 1;
  const sx = (x: number) => P + ((x - xMin) / xSpan) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - yMin) / ySpan) * (H - 2 * P);

  // regressione lineare (least squares)
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Dispersione ${xLabel} vs ${yLabel}`}>
        {/* griglia */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={P} x2={W - P} y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)} stroke="var(--border)" strokeWidth={1} />
            <line x1={P + t * (W - 2 * P)} x2={P + t * (W - 2 * P)} y1={P} y2={H - P} stroke="var(--border)" strokeWidth={1} />
          </g>
        ))}
        {/* assi etichette */}
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize={12} fontWeight={600}>{xLabel}</text>
        <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} className="fill-[var(--muted)]" fontSize={12} fontWeight={600}>{yLabel}</text>
        {/* retta di regressione */}
        {den !== 0 && (
          <line
            x1={sx(xMin)} y1={sy(slope * xMin + intercept)}
            x2={sx(xMax)} y2={sy(slope * xMax + intercept)}
            stroke="var(--brand-primary)" strokeWidth={2} strokeDasharray="6 4" opacity={0.6}
          />
        )}
        {/* punti */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={hover === i ? 7 : 5} fill={ROLE_COLOR[p.role]} stroke={p.injured ? "var(--bad)" : "#fff"} strokeWidth={p.injured ? 2.5 : 1.5} />
            {hover === i && (
              <g>
                <rect x={sx(p.x) + 8} y={sy(p.y) - 26} width={p.name.length * 7.5 + 16} height={20} rx={5} fill="var(--foreground)" />
                <text x={sx(p.x) + 16} y={sy(p.y) - 12} fontSize={11} fontWeight={600} className="fill-white">{p.name}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ============================================================================
// Insight
// ============================================================================
function InsightsView({ insights, projects }: { insights: Insight[]; projects: { title: string; area: string; status: string; owner: string }[] }) {
  const sevMeta: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    alta: { bg: "bg-red-50", text: "text-red-700", dot: "var(--bad)", label: "Priorità alta" },
    media: { bg: "bg-amber-50", text: "text-amber-700", dot: "var(--warn)", label: "Da monitorare" },
    info: { bg: "bg-blue-50", text: "text-blue-700", dot: "var(--elite)", label: "Informativo" },
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {insights.length === 0 && (
          <div className="card flex items-center gap-3 p-5 text-sm text-muted md:col-span-2">
            <Icon name="sparkle" size={18} className="text-emerald-600" /> Nessun segnale critico dai dati attuali.
          </div>
        )}
        {insights.map((ins) => {
          const m = sevMeta[ins.severity];
          return (
            <div key={ins.id} className="card brand-topline p-5">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.bg} ${m.text}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.dot }} /> {m.label}
                </span>
                <span className="text-[11px] text-muted-2">{ins.athletes.length} atleti</span>
              </div>
              <h3 className="mt-2 text-base font-bold">{ins.title}</h3>
              <p className="mt-1 text-[13px] text-muted">{ins.detail}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ins.athletes.slice(0, 8).map((n) => (
                  <span key={n} className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium">{n}</span>
                ))}
                {ins.athletes.length > 8 && <span className="text-[11px] text-muted-2">+{ins.athletes.length - 8}</span>}
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-background p-2 text-[11px] text-muted">
                <Icon name="link" size={13} className="mt-0.5 shrink-0 brand-text" /> {ins.science}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progetti di ricerca (preservati) */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon name="target" size={16} className="brand-text" /> Progetti di ricerca</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {projects.map((p) => (
            <div key={p.title} className="rounded-xl border border-border p-3">
              <div className="text-[13px] font-semibold leading-snug">{p.title}</div>
              <div className="mt-2 flex items-center justify-between">
                <Badge tone="brand">{p.area}</Badge>
                <span className="text-[10.5px] uppercase tracking-wide text-muted-2">{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Report builder
// ============================================================================
const REPORT_TYPES = [
  { id: "carico", label: "Settimanale · Carico & Disponibilità", icon: "load", scope: "squadra" },
  { id: "individuale", label: "Performance individuale", icon: "users", scope: "atleta" },
  { id: "medico", label: "Monitoraggio infortuni", icon: "medical", scope: "squadra" },
  { id: "correlazione", label: "Correlazione personalizzata", icon: "chart", scope: "squadra" },
] as const;

function ReportBuilder({
  clientName, matrix, insights, staff, corr,
}: {
  clientName: string;
  matrix: AthletePoint[];
  metrics: MetricDef[];
  insights: Insight[];
  staff: StaffMember[];
  corr: { r: number; xDef?: MetricDef; yDef?: MetricDef; points: { x: number; y: number; name: string }[] };
}) {
  const reports = useLocalCollection<SavedReport>(`reports`);
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("carico");
  const [athleteId, setAthleteId] = useState(matrix[0]?.id ?? "");
  const [recipients, setRecipients] = useState<string[]>(staff[0] ? [staff[0].name] : []);
  const [extraEmail, setExtraEmail] = useState("");
  const [note, setNote] = useState("");

  const typeDef = REPORT_TYPES.find((t) => t.id === type)!;
  const avg = (k: string) => mean(matrix.map((p) => p.v[k]));

  const report = useMemo(() => {
    const date = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    let title = `${typeDef.label} · ${clientName}`;
    const lines: string[] = [];
    let scope = "Squadra";

    if (type === "carico") {
      lines.push(`Carico medio squadra: ${Math.round(avg("loadAvg"))} AU (sRPE).`);
      lines.push(`Monotonia media: ${avg("monotony").toFixed(2)} · Strain medio: ${Math.round(avg("strain"))} AU.`);
      lines.push(`Distanza media: ${avg("distanceTot").toFixed(1)} km · Player Load medio: ${Math.round(avg("playerLoad"))} AU.`);
      const out = matrix.filter((p) => p.injured).length;
      lines.push(`Disponibilità: ${matrix.length - out}/${matrix.length} atleti monitorati.`);
      const topStrain = [...matrix].sort((a, b) => b.v.strain - a.v.strain).slice(0, 3).map((p) => p.name).join(", ");
      lines.push(`Strain più alto: ${topStrain}.`);
    } else if (type === "individuale") {
      const a = matrix.find((p) => p.id === athleteId);
      if (a) {
        title = `Report performance · ${a.name} (${clientName})`;
        scope = `${a.name} · ${a.role}`;
        lines.push(`P-Index: ${a.v.pIndex}° (media squadra ${Math.round(avg("pIndex"))}°).`);
        lines.push(`Forza ${a.v.forza}° · Potenza ${a.v.potenza}° · Reattività ${a.v.reattivita}°.`);
        lines.push(`Asimmetria arti: ${a.v.asymmetry}% ${a.v.asymmetry >= 15 ? "(sopra soglia 15%)" : "(nei limiti)"}.`);
        lines.push(`Carico medio: ${a.v.loadAvg} AU · Distanza: ${a.v.distanceTot} km · Vel. max: ${a.v.maxSpeed} km/h.`);
        lines.push(`Monotonia: ${a.v.monotony} · Picco di carico: ${a.v.loadSpike}σ.`);
        if (a.injured) lines.push(`⚠ Episodio medico aperto da ${a.v.injuryDays} giorni: gestire il ritorno graduale.`);
      }
    } else if (type === "medico") {
      const out = matrix.filter((p) => p.injured);
      scope = "Area medica";
      lines.push(`Atleti con episodio aperto: ${out.length}.`);
      out.forEach((p) => lines.push(`${p.name}: ${p.v.injuryDays} giorni · carico medio ${p.v.loadAvg} AU.`));
      const rtp = insights.find((i) => i.id === "rtp");
      if (rtp) lines.push(`Nota RTP: ${rtp.detail}`);
      if (out.length === 0) lines.push("Nessun episodio medico aperto.");
    } else if (type === "correlazione") {
      title = `Correlazione ${corr.xDef?.short} ↔ ${corr.yDef?.short} · ${clientName}`;
      scope = "Analisi correlazione";
      lines.push(`Coefficiente di Pearson r = ${corr.r >= 0 ? "+" : ""}${corr.r.toFixed(2)} (${strength(corr.r)}, ${corr.r > 0 ? "positiva" : "negativa"}).`);
      lines.push(`Variabili: ${corr.xDef?.label} vs ${corr.yDef?.label} su ${corr.points.length} atleti.`);
      lines.push(Math.abs(corr.r) < 0.2 ? "Relazione lineare non rilevante: serve approfondire." : `All'aumentare di ${corr.xDef?.short}, ${corr.yDef?.short} tende a ${corr.r > 0 ? "aumentare" : "diminuire"}.`);
      lines.push("Correlazione ≠ causalità: da validare con disegno sperimentale.");
    }

    if (note.trim()) lines.push(`Nota: ${note.trim()}`);
    return { title, date, scope, lines };
  }, [type, athleteId, note, matrix, clientName, corr, insights, typeDef, avg]);

  const allRecipients = [...recipients, ...(extraEmail.trim() ? [extraEmail.trim()] : [])];

  function toggleRecipient(name: string) {
    setRecipients((r) => (r.includes(name) ? r.filter((x) => x !== name) : [...r, name]));
  }

  function save() {
    reports.add({
      id: newId("rep"),
      type: typeDef.label,
      title: report.title,
      date: report.date,
      recipients: allRecipients,
      scope: report.scope,
      lines: report.lines,
    });
  }

  function printReport() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${report.title}</title>
      <style>body{font-family:-apple-system,Segoe UI,system-ui,sans-serif;color:#0f172a;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6}
      h1{font-size:22px;margin:0 0 4px}.meta{color:#64748b;font-size:13px;margin-bottom:24px}
      .tag{display:inline-block;background:#f1f5f9;border-radius:6px;padding:2px 8px;font-size:12px;margin:0 4px 4px 0}
      ul{padding-left:18px}li{margin:6px 0}.foot{margin-top:32px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px}</style></head>
      <body><h1>${report.title}</h1><div class="meta">${report.date} · ${report.scope} · TESTÀRE Data Intelligence</div>
      <div><b>Destinatari:</b> ${allRecipients.map((r) => `<span class="tag">${r}</span>`).join("") || "—"}</div>
      <ul>${report.lines.map((l) => `<li>${l}</li>`).join("")}</ul>
      <div class="foot">Generato da TESTÀRE CRM · ${clientName}. Dati di monitoraggio — uso interno staff.</div>
      </body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 250); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Configuratore */}
      <div className="space-y-4">
        <div className="card p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Tipo di report</div>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[13px] font-semibold transition-colors ${type === t.id ? "brand-soft-bg brand-text border-transparent" : "border-border text-foreground hover:bg-background"}`}
              >
                <Icon name={t.icon} size={16} /> {t.label}
              </button>
            ))}
          </div>

          {type === "individuale" && (
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">Atleta</span>
              <select className="inp" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
                {matrix.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Destinatari</div>
          <div className="space-y-1.5">
            {staff.map((s) => (
              <label key={s.name} className="flex cursor-pointer items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-background">
                <input type="checkbox" checked={recipients.includes(s.name)} onChange={() => toggleRecipient(s.name)} className="h-4 w-4 accent-[var(--brand-primary)]" />
                <span className="text-[13px] font-medium">{s.name}</span>
                <span className="text-[11px] text-muted-2">{s.role}</span>
              </label>
            ))}
          </div>
          <input className="inp mt-2" placeholder="+ Aggiungi email esterna" value={extraEmail} onChange={(e) => setExtraEmail(e.target.value)} />
          <textarea className="inp mt-2 min-h-[64px]" placeholder="Nota per i destinatari (opzionale)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {/* Anteprima + azioni */}
      <div className="space-y-4">
        <div className="card brand-topline overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Anteprima</div>
          <div className="p-5">
            <h3 className="text-lg font-bold leading-snug">{report.title}</h3>
            <div className="mt-0.5 text-[12px] text-muted">{report.date} · {report.scope}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allRecipients.length ? allRecipients.map((r) => <span key={r} className="brand-soft-bg brand-text rounded-md px-1.5 py-0.5 text-[11px] font-medium">{r}</span>) : <span className="text-[12px] text-muted-2">Nessun destinatario</span>}
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {report.lines.map((l, i) => (
                <li key={i} className="flex gap-2"><span className="brand-text">›</span><span>{l}</span></li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <button onClick={save} className="brand-bg brand-on flex-1 rounded-lg px-3.5 py-2 text-sm font-semibold">Salva report</button>
            <button onClick={printReport} className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-background">
              <Icon name="upload" size={15} /> Stampa / PDF
            </button>
          </div>
        </div>

        {/* Report salvati */}
        {reports.ready && reports.items.length > 0 && (
          <div className="card p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Report generati ({reports.items.length})</div>
            <ul className="space-y-1.5">
              {reports.items.slice().reverse().map((rp) => (
                <li key={rp.id} className="flex items-center gap-2 rounded-lg bg-background p-2.5">
                  <Icon name="clipboard" size={15} className="brand-text shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{rp.title}</div>
                    <div className="text-[11px] text-muted">{rp.date} · {rp.recipients.length} destinatari</div>
                  </div>
                  <button onClick={() => reports.remove(rp.id)} className="text-[11px] text-muted-2 hover:text-bad" aria-label="Elimina">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
