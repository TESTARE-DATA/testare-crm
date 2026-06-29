"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { DrillConfig, DrillEntity, DrillIntensity, Exercise, GoalType, PitchOrientation, TacticalCategory } from "@/lib/types";
import { useLocalCollection, newId } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui";

const CATEGORIES: TacticalCategory[] = ["Possesso", "Finalizzazione", "Transizioni", "Situazionale", "Riscaldamento tecnico", "Partita a tema"];
const GOAL_TYPES: GoalType[] = ["porte", "mini-porte", "porticine", "sponde", "nessuna"];
const SWATCHES = ["#e94f35", "#1e6fb8", "#16a34a", "#7c3aed", "#0b0b0c", "#f59e0b", "#ffffff", "#dc2626"];

type Shape = "spread" | "attack" | "blocks";

// Preset di campo per tipo di esercizio: cambia la grafica e i default.
const CATEGORY_PRESET: Record<TacticalCategory, { goalType: GoalType; goalkeepers: boolean; sectors: number; channels: number; jollyCount: number; shape: Shape; length: number; width: number; intensity: DrillIntensity }> = {
  "Possesso": { goalType: "sponde", goalkeepers: false, sectors: 1, channels: 3, jollyCount: 2, shape: "spread", length: 30, width: 30, intensity: "media" },
  "Finalizzazione": { goalType: "porte", goalkeepers: true, sectors: 3, channels: 1, jollyCount: 0, shape: "attack", length: 45, width: 40, intensity: "alta" },
  "Transizioni": { goalType: "mini-porte", goalkeepers: false, sectors: 2, channels: 2, jollyCount: 1, shape: "blocks", length: 40, width: 32, intensity: "alta" },
  "Situazionale": { goalType: "porte", goalkeepers: true, sectors: 3, channels: 2, jollyCount: 0, shape: "blocks", length: 50, width: 45, intensity: "media" },
  "Riscaldamento tecnico": { goalType: "nessuna", goalkeepers: false, sectors: 1, channels: 1, jollyCount: 0, shape: "spread", length: 25, width: 20, intensity: "bassa" },
  "Partita a tema": { goalType: "porte", goalkeepers: true, sectors: 1, channels: 1, jollyCount: 0, shape: "spread", length: 50, width: 45, intensity: "alta" },
};

// Moduli di gioco (per partita a tema / lavori a reparti). "Libero" = griglia.
const FORMATIONS = ["Libero", "4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "3-4-3", "4-5-1"] as const;
const MODULES: Record<string, number[]> = {
  "4-4-2": [4, 4, 2], "4-3-3": [4, 3, 3], "3-5-2": [3, 5, 2],
  "4-2-3-1": [4, 2, 3, 1], "3-4-3": [3, 4, 3], "4-5-1": [4, 5, 1],
};
const teamCount = (count: number, formation?: string) =>
  formation && MODULES[formation] ? MODULES[formation].reduce((s, x) => s + x, 0) : count;

// Suggerimenti rapidi cliccabili per regole/varianti.
const RULE_SUGGESTIONS = ["Max 2 tocchi", "Gol di prima", "Obbligo cambio gioco", "Fuorigioco attivo", "Pressing a tutto campo", "Sponde di prima", "Gol di testa doppio", "Palla a terra"];
const VARIANT_SUGGESTIONS = ["Jolly centrale", "Superiorità numerica", "Zona di rifinitura", "Limite di tempo possesso", "Doppia porticina", "Recupero palla = +1 uomo"];

const clamp01 = (v: number) => Math.max(0.01, Math.min(0.99, v));
const regFor = (shape: Shape) => shape === "attack" ? { a: [0.18, 0.6], b: [0.58, 0.9] }
  : shape === "blocks" ? { a: [0.06, 0.4], b: [0.6, 0.94] }
    : { a: [0.03, 0.47], b: [0.53, 0.97] };

// Layout in coordinate NORMALIZZATE (along, across) — base per posizioni editabili.
function gridN(n: number, a0: number, a1: number): [number, number][] {
  const c = Math.ceil(Math.sqrt(Math.max(1, n))), r = Math.ceil(Math.max(1, n) / c);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) { const cc = i % c, rr = Math.floor(i / c); out.push([a0 + ((cc + 1) / (c + 1)) * (a1 - a0), (rr + 1) / (r + 1)]); }
  return out;
}
function formationN(lines: number[], a0: number, a1: number, fromHigh: boolean): [number, number][] {
  const out: [number, number][] = [];
  const nl = lines.length;
  lines.forEach((k, li) => {
    const t = (li + 1) / (nl + 1);
    const along = fromHigh ? a1 - t * (a1 - a0) : a0 + t * (a1 - a0);
    for (let pi = 0; pi < k; pi++) out.push([along, (pi + 1) / (k + 1)]);
  });
  return out;
}

type BuildCfg = { playersA: number; playersB: number; formationA: string; formationB: string; jollyCount: number; goalkeepers: boolean; goalType: GoalType; shape: Shape };
// Posizioni iniziali automatiche, poi modificabili a mano (drag).
function buildEntities(c: BuildCfg): DrillEntity[] {
  const reg = regFor(c.shape);
  const A = MODULES[c.formationA] ? formationN(MODULES[c.formationA], 0.05, 0.47, false) : gridN(c.playersA, reg.a[0], reg.a[1]);
  const B = MODULES[c.formationB] ? formationN(MODULES[c.formationB], 0.53, 0.95, true) : gridN(c.playersB, reg.b[0], reg.b[1]);
  const J = gridN(c.jollyCount, 0.43, 0.57);
  const out: DrillEntity[] = [];
  A.forEach(([x, y], i) => out.push({ id: `A${i}`, kind: "A", x, y, label: `${i + 1}` }));
  B.forEach(([x, y], i) => out.push({ id: `B${i}`, kind: "B", x, y, label: `${i + 1}` }));
  J.forEach(([x, y], i) => out.push({ id: `J${i}`, kind: "J", x, y, label: "J" }));
  const showGk = c.goalkeepers && c.goalType !== "nessuna" && c.goalType !== "sponde";
  if (showGk) {
    out.push({ id: "GKA", kind: "GK", x: 0.045, y: 0.5, label: "P" });
    out.push({ id: "GKB", kind: "GK", x: 0.955, y: 0.5, label: "P" });
  }
  out.push({ id: "ball", kind: "ball", x: 0.5, y: 0.5, label: "" });
  return out;
}
const structSig = (c: BuildCfg) => `${c.playersA}|${c.playersB}|${c.formationA}|${c.formationB}|${c.jollyCount}|${c.goalkeepers}|${c.goalType}|${c.shape}`;

export function CampoLive({ clientId }: { clientId: string }) {
  const { add } = useLocalCollection<Exercise>(`drills:${clientId}`);
  const [saved, setSaved] = useState<string | null>(null);

  const [cfg, setCfg] = useState({
    name: "",
    category: "Possesso" as TacticalCategory,
    focus: "",
    length: 30,
    width: 30,
    orientation: "orizzontale" as PitchOrientation,
    playersA: 6,
    playersB: 6,
    formationA: "Libero" as string,
    formationB: "Libero" as string,
    jollyCount: 2,
    goalkeepers: false,
    teamAColor: "#e94f35",
    teamBColor: "#1e6fb8",
    goalType: "sponde" as GoalType,
    ballCount: 3,
    sectors: 1,
    channels: 3,
    durationMin: 15,
    series: 3,
    reps: 4,
    recoverySec: 90,
    intensity: "media" as DrillIntensity,
    shape: "spread" as Shape,
  });

  // Cambiando il tipo di esercizio si applica il preset di campo corrispondente.
  const applyCategory = (category: TacticalCategory) => {
    const p = CATEGORY_PRESET[category];
    setCfg((c) => ({ ...c, category, ...p }));
  };
  const [rules, setRules] = useState<string[]>(["Max 2 tocchi", "Gol valido solo di prima"]);
  const [variants, setVariants] = useState<string[]>(["Jolly centrale di sponda"]);
  const [ruleInput, setRuleInput] = useState("");
  const [variantInput, setVariantInput] = useState("");

  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => setCfg((c) => ({ ...c, [k]: v }));

  // ----- Lavagna: entità posizionabili (drag) + undo/redo -----
  const [entities, setEntities] = useState<DrillEntity[]>(() => buildEntities(cfg));
  const sigRef = useRef(structSig(cfg));
  const [past, setPast] = useState<DrillEntity[][]>([]);
  const [future, setFuture] = useState<DrillEntity[][]>([]);
  const pushHistory = () => { setPast((p) => [...p.slice(-39), entities]); setFuture([]); };
  const undo = () => { if (!past.length) return; setFuture((f) => [entities, ...f]); setEntities(past[past.length - 1]); setPast((p) => p.slice(0, -1)); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, entities]); setEntities(future[0]); setFuture((f) => f.slice(1)); };
  // Cambiando la STRUTTURA (numeri/moduli/jolly/portieri) le posizioni si rigenerano.
  // Cambiare dimensioni/orientamento NON resetta: le coordinate sono normalizzate.
  useEffect(() => {
    const sig = structSig(cfg);
    if (sig !== sigRef.current) { sigRef.current = sig; setEntities(buildEntities(cfg)); setPast([]); setFuture([]); }
  }, [cfg.playersA, cfg.playersB, cfg.formationA, cfg.formationB, cfg.jollyCount, cfg.goalkeepers, cfg.goalType, cfg.shape]);
  const moveEntity = (id: string, x: number, y: number) => setEntities((es) => es.map((e) => (e.id === id ? { ...e, x: clamp01(x), y: clamp01(y) } : e)));
  const resetPositions = () => { pushHistory(); setEntities(buildEntities(cfg)); };

  const effA = teamCount(cfg.playersA, cfg.formationA);
  const effB = teamCount(cfg.playersB, cfg.formationB);
  const totalPlayers = effA + effB + cfg.jollyCount + (cfg.goalkeepers ? 2 : 0);
  const density = useMemo(() => Math.round((cfg.length * cfg.width) / Math.max(1, totalPlayers)), [cfg.length, cfg.width, totalPlayers]);
  const workRest = useMemo(() => {
    const work = cfg.durationMin * 60 / Math.max(1, cfg.series * cfg.reps);
    return `${Math.round(work)}″:${cfg.recoverySec}″`;
  }, [cfg.durationMin, cfg.series, cfg.reps, cfg.recoverySec]);

  // Carico atteso stimato dalle impostazioni (interno + esterno).
  const est = useMemo(() => {
    const rpe = cfg.intensity === "alta" ? 8 : cfg.intensity === "media" ? 6 : 4;
    const mPerMin = cfg.intensity === "alta" ? 110 : cfg.intensity === "media" ? 82 : 55;
    // densità bassa (campo grande/pochi giocatori) -> più metri percorsi
    const densFactor = Math.min(1.25, Math.max(0.8, density / 70));
    const distanceKm = +((cfg.durationMin * mPerMin * densFactor) / 1000).toFixed(1);
    return {
      rpe,
      sRPE: cfg.durationMin * rpe,
      distanceKm,
      sprints: Math.round(cfg.durationMin * (cfg.intensity === "alta" ? 1.0 : cfg.intensity === "media" ? 0.55 : 0.2) * densFactor),
      hiM: Math.round(distanceKm * 1000 * (cfg.intensity === "alta" ? 0.12 : cfg.intensity === "media" ? 0.08 : 0.04)),
    };
  }, [cfg.intensity, cfg.durationMin, density]);

  const save = () => {
    const drill: DrillConfig = {
      pitchLengthM: cfg.length, pitchWidthM: cfg.width, orientation: cfg.orientation,
      playersPerTeam: effA, playersB: effB, formationA: cfg.formationA, formationB: cfg.formationB,
      jollyCount: cfg.jollyCount, goalkeepers: cfg.goalkeepers,
      teamAColor: cfg.teamAColor, teamBColor: cfg.teamBColor,
      goalType: cfg.goalType, ballCount: cfg.ballCount, sectors: cfg.sectors, channels: cfg.channels,
      durationMin: cfg.durationMin, series: cfg.series, reps: cfg.reps, recoverySec: cfg.recoverySec,
      intensity: cfg.intensity, densityM2: density, focus: cfg.focus, rules, variants,
      entities,
    };
    const ex: Exercise = {
      id: newId(`${clientId}-ex`), clientId,
      name: cfg.name.trim() || `Esercitazione ${effA}v${effB}`,
      domain: "tattico", category: cfg.category,
      description: `${effA}v${effB}${cfg.jollyCount ? `+${cfg.jollyCount}` : ""}${cfg.goalkeepers ? " + P" : ""}${cfg.formationA !== "Libero" || cfg.formationB !== "Libero" ? ` · moduli ${cfg.formationA}/${cfg.formationB}` : ""} su ${cfg.length}×${cfg.width}m · ${cfg.series}×${cfg.reps} · ${density} m²/giocatore · intensità ${cfg.intensity}.`,
      durationMin: cfg.durationMin, players: `${effA} vs ${effB}`,
      equipment: ["Casacche", `${cfg.ballCount} palloni`, cfg.goalType !== "nessuna" ? cfg.goalType : "coni"],
      tags: ["campo-live"], drill,
    };
    add(ex);
    setSaved(ex.name);
    setTimeout(() => setSaved(null), 3500);
  };

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl"><Icon name="live" size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campo Live</h1>
            <p className="mt-0.5 text-sm text-muted">Disegna l&apos;esercitazione nel dettaglio. Ogni modifica è live.</p>
          </div>
        </div>
        <button onClick={save} className="brand-bg brand-on flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"><Icon name="layers" size={16} /> Crea esercizio</button>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon name="link" size={16} /> «{saved}» salvato nelle <b>Esercitazioni</b> (Area Tecnica).
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* Campo + KPI — sticky così resta visibile mentre scorri i controlli */}
        <div className="space-y-4 lg:sticky lg:top-[68px]">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-3 py-2">
              <span className="text-[11px] font-semibold text-muted-2">✋ Trascina giocatori e palla</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={undo} disabled={!past.length} className="rounded-lg border border-border px-2 py-1 text-[12px] font-medium disabled:opacity-40 hover:bg-background" title="Annulla">↶ Annulla</button>
                <button onClick={redo} disabled={!future.length} className="rounded-lg border border-border px-2 py-1 text-[12px] font-medium disabled:opacity-40 hover:bg-background" title="Ripeti">↷ Ripeti</button>
                <button onClick={resetPositions} className="rounded-lg border border-border px-2 py-1 text-[12px] font-medium hover:bg-background" title="Riporta le posizioni automatiche">Reset</button>
              </div>
            </div>
            <Pitch cfg={cfg} density={density} entities={entities} onMove={moveEntity} onDragStart={pushHistory} />
            <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-5">
              <Kpi label="Dimensioni" value={`${cfg.length}×${cfg.width}`} sub="metri" />
              <Kpi label="Giocatori" value={`${totalPlayers}`} sub={`${effA}v${effB}${cfg.jollyCount ? `+${cfg.jollyCount}` : ""}${effA !== effB ? " ⚡" : ""}`} />
              <Kpi label="Densità" value={`${density}`} sub="m²/gioc." />
              <Kpi label="Volume" value={`${cfg.series}×${cfg.reps}`} sub={`${cfg.durationMin}′`} />
              <Kpi label="Work:Rest" value={workRest} sub={`int. ${cfg.intensity}`} />
            </div>
          </div>

          {/* Carico atteso stimato */}
          <div className="card p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Icon name="trend" size={16} className="brand-text" />
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-2">Carico atteso (stima)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <EstBox label="Interno" value={`${est.sRPE}`} sub={`sRPE · RPE ${est.rpe}`} brand />
              <EstBox label="Distanza" value={`${est.distanceKm} km`} sub="esterno" />
              <EstBox label="Sprint" value={`${est.sprints}`} sub="attesi" />
              <EstBox label="Alta int." value={`${est.hiM} m`} sub="ad alta vel." />
            </div>
            <p className="mt-2 text-[10px] text-muted-2">Stima da intensità, durata e densità — confrontabile col carico reale (GPS) dopo la seduta.</p>
          </div>
        </div>

        {/* Controlli */}
        <div className="space-y-4">
          <Section title="Esercizio">
            <input className="inp mb-2" placeholder="Nome esercitazione" value={cfg.name} onChange={(e) => set("name", e.target.value)} />
            <select className="inp mb-2" value={cfg.category} onChange={(e) => applyCategory(e.target.value as TacticalCategory)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="text-[11px] text-muted-2">Cambiando tipo, il campo si adatta automaticamente. Poi personalizzi tutto.</p>
            <input className="inp" placeholder="Focus / obiettivo (es. ampiezza e cambio gioco)" value={cfg.focus} onChange={(e) => set("focus", e.target.value)} />
          </Section>

          <Section title="Campo">
            <Slider label="Lunghezza" value={cfg.length} min={10} max={105} unit="m" onChange={(v) => set("length", v)} />
            <Slider label="Larghezza" value={cfg.width} min={8} max={68} unit="m" onChange={(v) => set("width", v)} />
            <Seg label="Orientamento" value={cfg.orientation} options={["orizzontale", "verticale"]} onChange={(v) => set("orientation", v as PitchOrientation)} />
            <Slider label="Settori (vert.)" value={cfg.sectors} min={1} max={6} unit="" onChange={(v) => set("sectors", v)} />
            <Slider label="Canali (orizz.)" value={cfg.channels} min={1} max={5} unit="" onChange={(v) => set("channels", v)} />
          </Section>

          <TeamSection
            title="Squadra A" color={cfg.teamAColor} onColor={(v) => set("teamAColor", v)}
            formation={cfg.formationA} onFormation={(v) => set("formationA", v)}
            players={cfg.playersA} onPlayers={(v) => set("playersA", v)} count={effA}
          />
          <TeamSection
            title="Squadra B" color={cfg.teamBColor} onColor={(v) => set("teamBColor", v)}
            formation={cfg.formationB} onFormation={(v) => set("formationB", v)}
            players={cfg.playersB} onPlayers={(v) => set("playersB", v)} count={effB}
          />

          <Section title="Extra">
            {effA !== effB && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] font-medium text-amber-700">
                ⚡ Superiorità numerica: {effA} contro {effB}
              </div>
            )}
            <Slider label="Jolly neutri" value={cfg.jollyCount} min={0} max={4} unit="" onChange={(v) => set("jollyCount", v)} />
            <Toggle label="Portieri" on={cfg.goalkeepers} onChange={(v) => set("goalkeepers", v)} />
          </Section>

          <Section title="Strutture">
            <Seg label="Porte" value={cfg.goalType} options={GOAL_TYPES} onChange={(v) => set("goalType", v as GoalType)} small />
            <Slider label="Palloni" value={cfg.ballCount} min={0} max={10} unit="" onChange={(v) => set("ballCount", v)} />
          </Section>

          <Section title="Volume & intensità">
            <Slider label="Durata totale" value={cfg.durationMin} min={3} max={45} unit="′" onChange={(v) => set("durationMin", v)} />
            <Slider label="Serie" value={cfg.series} min={1} max={10} unit="" onChange={(v) => set("series", v)} />
            <Slider label="Ripetizioni" value={cfg.reps} min={1} max={12} unit="" onChange={(v) => set("reps", v)} />
            <Slider label="Recupero" value={cfg.recoverySec} min={0} max={240} unit="″" step={15} onChange={(v) => set("recoverySec", v)} />
            <Seg label="Intensità" value={cfg.intensity} options={["bassa", "media", "alta"]} onChange={(v) => set("intensity", v as DrillIntensity)} />
          </Section>

          <Section title="Regole"><TagEditor items={rules} setItems={setRules} input={ruleInput} setInput={setRuleInput} placeholder="Aggiungi regola…" tone="brand" suggestions={RULE_SUGGESTIONS} /></Section>
          <Section title="Varianti"><TagEditor items={variants} setItems={setVariants} input={variantInput} setInput={setVariantInput} placeholder="Aggiungi variante…" tone="default" suggestions={VARIANT_SUGGESTIONS} /></Section>
        </div>
      </div>
    </div>
  );
}

// ---- Campo SVG --------------------------------------------------------------
type PitchCfg = {
  length: number; width: number; orientation: PitchOrientation; playersA: number; playersB: number; formationA: string; formationB: string; jollyCount: number;
  goalkeepers: boolean; teamAColor: string; teamBColor: string; goalType: GoalType; ballCount: number; sectors: number; channels: number; shape: Shape;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function Pitch({ cfg, density, entities, onMove, onDragStart }: { cfg: PitchCfg; density: number; entities: DrillEntity[]; onMove: (id: string, x: number, y: number) => void; onDragStart: () => void }) {
  const PAD = 22;
  const horizontal = cfg.orientation === "orizzontale";
  const ratio = cfg.length / cfg.width; // lungo : corto (in metri)

  // Dimensioni px che rispettano le PROPORZIONI reali del campo.
  const MAX_LONG = 780, MAX_SHORT = 430, MIN_SHORT = 150;
  let LONG = MAX_LONG, SHORT = LONG / ratio;
  if (SHORT > MAX_SHORT) { SHORT = MAX_SHORT; LONG = SHORT * ratio; }
  if (SHORT < MIN_SHORT) { SHORT = MIN_SHORT; LONG = Math.min(MAX_LONG, SHORT * ratio); }
  const W = horizontal ? LONG : SHORT;
  const H = horizontal ? SHORT : LONG;
  const vbW = W + PAD * 2, vbH = H + PAD * 2;
  const minDim = Math.min(LONG, SHORT);

  // mappa (along 0..1 sull'asse lungo, across 0..1 sul corto) -> px
  const m = (along: number, across: number): [number, number] =>
    horizontal ? [PAD + along * LONG, PAD + across * SHORT] : [PAD + across * SHORT, PAD + along * LONG];

  // Raggio giocatore proporzionato allo SPAZIO disponibile (mai gigante)
  const per = Math.max(1, teamCount(cfg.playersA, cfg.formationA), teamCount(cfg.playersB, cfg.formationB));
  const cols = Math.ceil(Math.sqrt(per)), rows = Math.ceil(per / cols);
  const R = clamp(Math.min((0.46 * LONG) / (cols + 1), SHORT / (rows + 1)) * 0.46, 5, 15);
  const SW = Math.max(1, R * 0.18); // spessore tratti proporzionato

  // --- Drag delle entità: conversione coordinate e hit-test ---
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgPoint = (clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current; if (!svg) return null;
    const ctm = svg.getScreenCTM(); if (!ctm) return null;
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const sp = pt.matrixTransform(ctm.inverse());
    return [sp.x, sp.y];
  };
  const toNorm = (clientX: number, clientY: number): [number, number] => {
    const sp = svgPoint(clientX, clientY); if (!sp) return [0.5, 0.5];
    return horizontal ? [(sp[0] - PAD) / LONG, (sp[1] - PAD) / SHORT] : [(sp[1] - PAD) / LONG, (sp[0] - PAD) / SHORT];
  };
  const onPointerDown = (ev: RPointerEvent<SVGSVGElement>) => {
    const sp = svgPoint(ev.clientX, ev.clientY); if (!sp) return;
    let best: string | null = null, bd = (R * 1.7) ** 2;
    for (const e of entities) { const [px, py] = m(e.x, e.y); const d = (px - sp[0]) ** 2 + (py - sp[1]) ** 2; if (d < bd) { bd = d; best = e.id; } }
    if (best) { onDragStart(); setDragId(best); try { svgRef.current?.setPointerCapture(ev.pointerId); } catch { /* noop */ } ev.preventDefault(); }
  };
  const onPointerMove = (ev: RPointerEvent<SVGSVGElement>) => {
    if (!dragId) return;
    const [a, x] = toNorm(ev.clientX, ev.clientY);
    onMove(dragId, a, x);
  };
  const endDrag = (ev: RPointerEvent<SVGSVGElement>) => {
    if (dragId) { try { svgRef.current?.releasePointerCapture(ev.pointerId); } catch { /* noop */ } }
    setDragId(null);
  };

  const stripes = 8;
  const showMarks = cfg.goalType !== "nessuna" && cfg.goalType !== "sponde";
  const cc = m(0.5, 0.5); // centro

  // rettangolo da due coppie (along,across)
  const rect = (a0: number, a1: number, x0: number, x1: number) => {
    const p1 = m(a0, x0), p2 = m(a1, x1);
    return { x: Math.min(p1[0], p2[0]), y: Math.min(p1[1], p2[1]), w: Math.abs(p2[0] - p1[0]), h: Math.abs(p2[1] - p1[1]) };
  };

  // porta a una estremità (end = 0 | 1)
  const goalEls = (end: 0 | 1) => {
    if (!showMarks) return null;
    const half = cfg.goalType === "porte" ? 0.16 : cfg.goalType === "mini-porte" ? 0.10 : 0.055;
    const depth = 11 / LONG;
    const inner = end === 0 ? 0 : 1;
    const outer = end === 0 ? -depth : 1 + depth;
    const r = rect(inner, outer, 0.5 - half, 0.5 + half);
    const nets = [];
    for (let i = 1; i < 4; i++) nets.push(horizontal
      ? <line key={`gv${end}${i}`} x1={r.x + (r.w * i) / 4} y1={r.y} x2={r.x + (r.w * i) / 4} y2={r.y + r.h} stroke="#fff" strokeWidth={0.5} opacity={0.4} />
      : <line key={`gh${end}${i}`} x1={r.x} y1={r.y + (r.h * i) / 4} x2={r.x + r.w} y2={r.y + (r.h * i) / 4} stroke="#fff" strokeWidth={0.5} opacity={0.4} />);
    return <g><rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#ffffff" fillOpacity={0.1} stroke="#fff" strokeWidth={1.6} />{nets}</g>;
  };

  const pen0 = rect(0, 0.15, 0.5 - 0.3, 0.5 + 0.3);
  const pen1 = rect(0.85, 1, 0.5 - 0.3, 0.5 + 0.3);
  const goa0 = rect(0, 0.06, 0.5 - 0.16, 0.5 + 0.16);
  const goa1 = rect(0.94, 1, 0.5 - 0.16, 0.5 + 0.16);
  const sp0 = m(0.1, 0.5), sp1 = m(0.9, 0.5);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${vbW} ${vbH}`} className="w-full select-none" style={{ maxHeight: 500, touchAction: "none", cursor: dragId ? "grabbing" : "default" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <defs>
        <radialGradient id="grass" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#2fab63" /><stop offset="100%" stopColor="#1c8f4f" />
        </radialGradient>
        <filter id="psh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy={R * 0.18} stdDeviation={R * 0.16} floodColor="#06311c" floodOpacity="0.45" /></filter>
        <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#000" stopOpacity="0.16" /><stop offset="22%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.14" /></linearGradient>
      </defs>

      {/* surround scuro */}
      <rect x={0} y={0} width={vbW} height={vbH} rx={10} fill="#15703f" />
      {/* prato */}
      <rect x={PAD} y={PAD} width={W} height={H} fill="url(#grass)" />
      {/* strisce di taglio */}
      {Array.from({ length: stripes }).map((_, i) => (i % 2 === 0 ? null : (horizontal
        ? <rect key={i} x={PAD + (i * W) / stripes} y={PAD} width={W / stripes} height={H} fill="#ffffff" opacity={0.05} />
        : <rect key={i} x={PAD} y={PAD + (i * H) / stripes} width={W} height={H / stripes} fill="#ffffff" opacity={0.05} />)))}
      <rect x={PAD} y={PAD} width={W} height={H} fill="url(#vig)" />

      {/* MARCATURE */}
      <g stroke="#fff" fill="none" strokeWidth={1.7} opacity={0.92} strokeLinejoin="round">
        <rect x={PAD} y={PAD} width={W} height={H} />
        <line x1={m(0.5, 0)[0]} y1={m(0.5, 0)[1]} x2={m(0.5, 1)[0]} y2={m(0.5, 1)[1]} />
        <circle cx={cc[0]} cy={cc[1]} r={minDim * 0.115} />
        {showMarks && <>
          <rect x={pen0.x} y={pen0.y} width={pen0.w} height={pen0.h} />
          <rect x={pen1.x} y={pen1.y} width={pen1.w} height={pen1.h} />
          <rect x={goa0.x} y={goa0.y} width={goa0.w} height={goa0.h} />
          <rect x={goa1.x} y={goa1.y} width={goa1.w} height={goa1.h} />
        </>}
      </g>
      {/* dischetti */}
      <circle cx={cc[0]} cy={cc[1]} r={1.8} fill="#fff" />
      {showMarks && <><circle cx={sp0[0]} cy={sp0[1]} r={1.6} fill="#fff" /><circle cx={sp1[0]} cy={sp1[1]} r={1.6} fill="#fff" /></>}

      {/* sponde (boards) sulle fasce lunghe */}
      {cfg.goalType === "sponde" && <g stroke="#fff" strokeWidth={3.2} opacity={0.85}>
        <line x1={m(0, 0)[0]} y1={m(0, 0)[1]} x2={m(1, 0)[0]} y2={m(1, 0)[1]} />
        <line x1={m(0, 1)[0]} y1={m(0, 1)[1]} x2={m(1, 1)[0]} y2={m(1, 1)[1]} />
      </g>}

      {/* settori (asse lungo) e canali (asse corto), tratteggiati */}
      {Array.from({ length: cfg.sectors - 1 }).map((_, i) => { const a = (i + 1) / cfg.sectors; const p0 = m(a, 0), p1 = m(a, 1); return <line key={`s${i}`} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke="#fff" strokeWidth={1.2} strokeDasharray="5 6" opacity={0.45} />; })}
      {Array.from({ length: cfg.channels - 1 }).map((_, i) => { const a = (i + 1) / cfg.channels; const p0 = m(0, a), p1 = m(1, a); return <line key={`c${i}`} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke="#fff" strokeWidth={1.2} strokeDasharray="3 7" opacity={0.34} />; })}

      {/* porte */}
      {goalEls(0)}{goalEls(1)}

      {/* palloni */}
      {Array.from({ length: cfg.ballCount }).map((_, i) => {
        const sp = (i - (cfg.ballCount - 1) / 2) * (R * 1.5);
        const b = horizontal ? [cc[0] + sp, PAD + H - R] : [PAD + W - R, cc[1] + sp];
        const br = Math.max(2.5, R * 0.42);
        return <g key={`b${i}`}><ellipse cx={b[0]} cy={b[1] + br * 0.7} rx={br * 0.8} ry={br * 0.3} fill="#000" opacity={0.2} /><circle cx={b[0]} cy={b[1]} r={br} fill="#fff" stroke="#0b0b0c" strokeWidth={0.5} /><circle cx={b[0]} cy={b[1]} r={br * 0.42} fill="#0b0b0c" /></g>;
      })}

      {/* entità trascinabili: giocatori, portieri, jolly, palla */}
      {entities.map((e) => {
        const [px, py] = m(e.x, e.y);
        if (e.kind === "ball") {
          const br = Math.max(3, R * 0.5);
          return <g key={e.id} style={{ cursor: "grab" }}><ellipse cx={px} cy={py + br * 0.7} rx={br * 0.85} ry={br * 0.32} fill="#000" opacity={0.22} /><circle cx={px} cy={py} r={br} fill="#fff" stroke="#0b0b0c" strokeWidth={0.6} /><circle cx={px} cy={py} r={br * 0.42} fill="#0b0b0c" /></g>;
        }
        const color = e.kind === "A" ? cfg.teamAColor : e.kind === "B" ? cfg.teamBColor : "#facc15";
        return <Player key={e.id} x={px} y={py} r={R} sw={SW} color={color} label={e.label} active={dragId === e.id} />;
      })}

      {/* densità */}
      <g>
        <rect x={vbW / 2 - 52} y={6} width={104} height={19} rx={9.5} fill="#06311c" opacity={0.55} />
        <text x={vbW / 2} y={18.5} textAnchor="middle" fill="#fff" style={{ fontSize: 10.5, fontWeight: 700 }}>{density} m²/giocatore</text>
      </g>
    </svg>
  );
}

function Player({ x, y, color, label, r, sw, active }: { x: number; y: number; color: string; label: string; r: number; sw: number; active?: boolean }) {
  const dark = isDark(color);
  return (
    <g style={{ cursor: "grab" }}>
      {active && <circle cx={x} cy={y} r={r + sw + 2} fill="none" stroke="#fff" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.9} />}
      <ellipse cx={x} cy={y + r * 0.62} rx={r * 0.82} ry={r * 0.3} fill="#06311c" opacity={0.28} />
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={sw} filter="url(#psh)" />
      <circle cx={x} cy={y - r * 0.34} r={r * 0.6} fill="#fff" opacity={0.16} />
      <text x={x} y={y + 0.3} textAnchor="middle" dominantBaseline="central" fill={dark ? "#fff" : "#13202b"} style={{ fontSize: Math.max(7, r * 0.9), fontWeight: 800 }}>{label}</text>
    </g>
  );
}
function isDark(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

// ---- Controlli --------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted-2">{title}</h3>
      {children}
    </div>
  );
}
function Slider({ label, value, min, max, unit, step, onChange }: { label: string; value: number; min: number; max: number; unit: string; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{label}</span><span className="brand-text font-mono font-semibold">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
    </div>
  );
}
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <button onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "brand-bg" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
function Seg({ label, value, options, onChange, small }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`rounded-lg border px-2.5 py-1 font-medium capitalize ${small ? "text-[11px]" : "text-[12px]"} ${value === o ? "brand-bg brand-on border-transparent" : "border-border hover:bg-background"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-20 text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-1">
        {SWATCHES.map((c) => (
          <button key={c} onClick={() => onChange(c)} className={`h-5 w-5 rounded-full ring-1 ring-border transition-transform ${value.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-foreground" : ""}`} style={{ backgroundColor: c }} aria-label={c} />
        ))}
        <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full ring-1 ring-border" title="Colore personalizzato">
          <span className="absolute inset-0" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} />
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  );
}
function TagEditor({ items, setItems, input, setInput, placeholder, tone, suggestions = [] }: { items: string[]; setItems: (v: string[]) => void; input: string; setInput: (v: string) => void; placeholder: string; tone: "brand" | "default"; suggestions?: readonly string[] }) {
  const addItem = (val?: string) => {
    const v = (val ?? input).trim();
    if (v && !items.includes(v)) setItems([...items, v]);
    if (!val) setInput("");
  };
  const free = suggestions.filter((s) => !items.includes(s));
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="flex items-center gap-1"><Badge tone={tone}>{it}</Badge><button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-[11px] text-muted-2 hover:text-red-600">✕</button></span>
        ))}
        {items.length === 0 && <span className="text-[12px] text-muted-2">Nessuna voce.</span>}
      </div>
      <div className="flex gap-2">
        <input className="inp" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} />
        <button onClick={() => addItem()} className="brand-bg brand-on rounded-lg px-3 text-sm font-semibold">+</button>
      </div>
      {free.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="self-center text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Rapide:</span>
          {free.map((s) => (
            <button key={s} onClick={() => addItem(s)} className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11.5px] text-muted transition-colors hover:border-foreground/30 hover:text-foreground">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamSection({ title, color, onColor, formation, onFormation, players, onPlayers, count }: {
  title: string; color: string; onColor: (v: string) => void;
  formation: string; onFormation: (v: string) => void;
  players: number; onPlayers: (v: number) => void; count: number;
}) {
  return (
    <Section title={title}>
      <ColorRow label="Casacca" value={color} onChange={onColor} />
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between"><span className="text-[12px] font-medium text-muted">Modulo</span><span className="text-[12px] font-semibold">{formation === "Libero" ? `${count} giocatori` : formation}</span></div>
        <select className="inp" value={formation} onChange={(e) => onFormation(e.target.value)}>
          {FORMATIONS.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      {formation === "Libero" && <Slider label="Giocatori" value={players} min={1} max={11} unit="" onChange={onPlayers} />}
    </Section>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface px-2 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className="text-base font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-2">{sub}</div>}
    </div>
  );
}
function EstBox({ label, value, sub, brand }: { label: string; value: string; sub?: string; brand?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 text-center ${brand ? "brand-soft-bg" : "bg-background"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className={`text-lg font-bold ${brand ? "brand-text" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-2">{sub}</div>}
    </div>
  );
}
