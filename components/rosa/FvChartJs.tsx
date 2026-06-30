"use client";

import { useEffect, useRef } from "react";

// ============================================================================
// Renderizza il grafico Profilo Carico-Velocità ESATTAMENTE come nel report:
// usa lo stesso config Chart.js (data-chart-config) salvato dall'import. Chart.js
// è caricato dinamicamente (solo lato client, solo quando serve) per non pesare
// sul bundle. Il config porta già retta corrente + misurati + 1RM + retta della
// sessione precedente (tratteggiata) per la variazione.
// ============================================================================

export function FvChartJs({ config }: { config: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let chart: { destroy: () => void } | null = null;
    let alive = true;
    let cfg: Record<string, unknown> | null = null;
    try { cfg = JSON.parse(config); } catch { cfg = null; }
    if (!cfg || !canvasRef.current) return;

    // Adatta al contenitore mantenendo lo stile del report.
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

  return (
    <div className="rounded-lg bg-white p-1.5" style={{ position: "relative", height: 250 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
