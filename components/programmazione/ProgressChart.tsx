"use client";

import { useId, useState } from "react";

export interface ChartPoint { label: string; value: number }

/** Grafico a linea morbida stile Apple: curva fluida, area sfumata, valore live. */
export function ProgressChart({ data, unit = "kg", height = 200 }: { data: ChartPoint[]; unit?: string; height?: number }) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, PAD_L = 12, PAD_R = 12, PAD_T = 26, PAD_B = 24;
  if (data.length < 2) return <div className="flex h-40 items-center justify-center text-sm text-muted">Storico insufficiente.</div>;

  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const lo = min - range * 0.25, hi = max + range * 0.25;
  const x = (i: number) => PAD_L + (i / (data.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));

  const line = smooth(pts);
  const area = `${line} L ${pts[pts.length - 1].x},${H - PAD_B} L ${pts[0].x},${H - PAD_B} Z`;

  const cur = data[data.length - 1].value;
  const delta = cur - data[0].value;
  const active = hover ?? data.length - 1;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">Attuale</div>
          <div className="text-2xl font-extrabold leading-none">{cur}<span className="ml-1 text-sm font-semibold text-muted">{unit}</span></div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-2">dal primo rilevamento</div>
          <div className="text-[13px] font-bold" style={{ color: delta >= 0 ? "var(--good)" : "var(--bad)" }}>{delta >= 0 ? "▲ +" : "▼ "}{delta} {unit}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H, overflow: "visible" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={PAD_L} y1={PAD_T + g * (H - PAD_T - PAD_B)} x2={W - PAD_R} y2={PAD_T + g * (H - PAD_T - PAD_B)} stroke="var(--border)" strokeWidth={1} />)}
        <path d={area} fill={`url(#area-${gid})`} />
        <path d={line} fill="none" stroke="var(--brand-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {/* punti */}
        {pts.map((p, i) => (
          <g key={i}>
            <rect x={p.x - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <circle cx={p.x} cy={p.y} r={i === active ? 4 : 2.5} fill="#fff" stroke="var(--brand-primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {/* callout punto attivo */}
        <g transform={`translate(${pts[active].x}, ${pts[active].y})`}>
          <line x1={0} y1={5} x2={0} y2={H - PAD_B - pts[active].y - 2} stroke="var(--brand-primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} vectorEffect="non-scaling-stroke" />
          <rect x={-24} y={-22} width={48} height={15} rx={7.5} fill="var(--brand-primary)" />
          <text x={0} y={-11} textAnchor="middle" fill="#fff" style={{ fontSize: 9.5, fontWeight: 700 }}>{data[active].value} {unit}</text>
        </g>
        {/* etichette x (prima, attiva, ultima) */}
        {data.map((d, i) => (i === 0 || i === data.length - 1 || i === active ? (
          <text key={i} x={Math.max(PAD_L + 10, Math.min(W - PAD_R - 10, pts[i].x))} y={H - 5} textAnchor="middle" fill="var(--muted-2)" style={{ fontSize: 9 }}>{d.label}</text>
        ) : null))}
      </svg>
    </div>
  );
}

function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}
