"use client";

import { useEffect, useRef } from "react";
import type { FvProfile } from "@/lib/types";

// ============================================================================
// Renderizza il grafico Profilo Carico-Velocità ESATTAMENTE come nel report:
// usa lo stesso config Chart.js (data-chart-config) salvato dall'import. Chart.js
// è caricato dinamicamente (solo lato client, solo quando serve) per non pesare
// sul bundle. Il config porta già retta corrente + misurati + 1RM + retta della
// sessione precedente (tratteggiata) per la variazione.
// Retrocompatibilità: per i dati importati prima di chartConfig, ricostruisce un
// config equivalente dai punti (measured/line/oneRm) con lo stile del report.
// ============================================================================

const STYLE_REG = { showLine: true, borderColor: "#ea5c3b", borderWidth: 2.5, borderDash: [] as number[], pointRadius: 0, pointHitRadius: 0 };
const STYLE_MEAS = { backgroundColor: "#ea5c3b", borderColor: "#a93f24", borderWidth: 1.5, pointRadius: 6, pointHitRadius: 15, showLine: false };
const STYLE_1RM = { backgroundColor: "#f59e0b", borderColor: "#92400e", borderWidth: 1.5, pointRadius: 7, pointHitRadius: 15, pointStyle: "rectRot", showLine: false };
const AXIS = (text: string) => ({ title: { display: true, text, color: "#4b5563", font: { size: 10, weight: "700" } }, grid: { color: "rgba(11,15,25,0.06)" }, ticks: { color: "#4b5563" } });

/** Config a partire dai punti legacy (retro-compat), nello stile del report. */
function configFromPoints(fv: FvProfile): string | null {
  const datasets: Record<string, unknown>[] = [];
  if (fv.line && fv.line.length >= 2) datasets.push({ label: "reg", data: fv.line, ...STYLE_REG });
  if (fv.measured && fv.measured.length) datasets.push({ label: "Misurati", data: fv.measured, ...STYLE_MEAS });
  if (fv.oneRm) datasets.push({ label: "1RM", data: [fv.oneRm], ...STYLE_1RM });
  if (!datasets.length) return null;
  return JSON.stringify({
    type: "scatter", data: { datasets },
    options: { scales: { x: AXIS("CARICO (kg)"), y: { ...AXIS("VELOCITÀ (m/s)"), ticks: { color: "#4b5563", stepSize: 0.2 } } }, plugins: { legend: { display: false } } },
  });
}

export function FvChartJs({ fv }: { fv: FvProfile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = fv.chartConfig || configFromPoints(fv);

  useEffect(() => {
    if (!config) return;
    let chart: { destroy: () => void } | null = null;
    let alive = true;
    let cfg: Record<string, unknown> | null = null;
    try { cfg = JSON.parse(config); } catch { cfg = null; }
    if (!cfg || !canvasRef.current) return;

    const options = (cfg.options as Record<string, unknown>) ?? {};
    options.responsive = true;
    options.maintainAspectRatio = false;
    cfg.options = options;

    import("chart.js/auto").then(({ default: Chart }) => {
      if (!alive || !canvasRef.current) return;
      // @ts-expect-error — config dinamico letto dal report (forma Chart.js valida).
      chart = new Chart(canvasRef.current, cfg);
    });

    return () => { alive = false; chart?.destroy(); };
  }, [config]);

  if (!config) return null;
  return (
    <div className="rounded-lg bg-white p-1.5" style={{ position: "relative", height: 250 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
