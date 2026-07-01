"use client";

import { useId, useState } from "react";
import { SCORE_AMBER, SCORE_RED, FLAG_META, flagFromScore, type Flag } from "@/lib/readinessEngine-core";

export interface RPoint { date: string; score: number | null; flag: Flag }

const fmtDay = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Grafico readiness (0–100) su base individuale: 50 = media dell'atleta.
 * Bande z (ambra/rosso), linea morbida, punti colorati per flag, hover con
 * tooltip. I giorni non compilati restano vuoti (marcatore cavo). Estetica pulita.
 */
export function ReadinessChart({ points, height = 210 }: { points: RPoint[]; height?: number }) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <div className="flex h-40 items-center justify-center text-sm text-muted">Storico insufficiente.</div>;

  const W = 720, H = height, PAD_L = 8, PAD_R = 8, PAD_T = 16, PAD_B = 26;
  const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (i / (points.length - 1)) * iw;
  const y = (v: number) => PAD_T + (1 - v / 100) * ih;

  // Segmenti della linea sui soli punti compilati (salta i buchi).
  const filled = points.map((p, i) => ({ i, p })).filter((o) => o.p.score != null) as { i: number; p: { date: string; score: number; flag: Flag } }[];
  // Colore coerente col valore mostrato: dallo score, non dal flag composito.
  const segPts = filled.map((o) => ({ x: x(o.i), y: y(o.p.score), flag: flagFromScore(o.p.score), date: o.p.date, score: o.p.score }));
  const line = smooth(segPts.map((s) => ({ x: s.x, y: s.y })));
  const area = segPts.length >= 2 ? `${line} L ${segPts[segPts.length - 1].x},${PAD_T + ih} L ${segPts[0].x},${PAD_T + ih} Z` : "";

  const active = hover != null && points[hover].score != null ? hover : null;
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ height: H }} preserveAspectRatio="none"
      onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={`ra-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bande di rischio (z→score) */}
      <rect x={PAD_L} y={y(SCORE_AMBER)} width={iw} height={y(SCORE_RED) - y(SCORE_AMBER)} fill="var(--warn)" opacity={0.06} />
      <rect x={PAD_L} y={y(SCORE_RED)} width={iw} height={PAD_T + ih - y(SCORE_RED)} fill="var(--bad)" opacity={0.06} />

      {/* Baseline individuale (50) + soglie */}
      <line x1={PAD_L} y1={y(50)} x2={W - PAD_R} y2={y(50)} stroke="var(--muted-2)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <text x={W - PAD_R} y={y(50) - 4} textAnchor="end" className="fill-muted-2" fontSize="9">norma (media individuale)</text>
      <line x1={PAD_L} y1={y(SCORE_AMBER)} x2={W - PAD_R} y2={y(SCORE_AMBER)} stroke="var(--warn)" strokeWidth={1} strokeDasharray="2 5" opacity={0.5} vectorEffect="non-scaling-stroke" />

      {area && <path d={area} fill={`url(#ra-${gid})`} />}
      {line && <path d={line} fill="none" stroke="var(--brand-primary)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}

      {/* Giorni non compilati: marcatore cavo sulla baseline */}
      {points.map((p, i) => p.score == null && (
        <circle key={`n-${i}`} cx={x(i)} cy={y(50)} r={3} fill="var(--surface)" stroke="var(--muted-2)" strokeWidth={1.5} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      ))}

      {/* Punti compilati colorati per flag */}
      {segPts.map((s, k) => (
        <circle key={k} cx={s.x} cy={s.y} r={active != null && points[active].date === s.date ? 5 : 3.2} fill="#fff" stroke={FLAG_META[s.flag].color} strokeWidth={2.4} vectorEffect="non-scaling-stroke" />
      ))}

      {/* Hover hit-areas + crosshair */}
      {points.map((p, i) => (
        <rect key={`h-${i}`} x={x(i) - iw / points.length / 2} y={0} width={iw / points.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
      {active != null && (() => {
        const p = points[active] as { date: string; score: number; flag: Flag };
        const cx = x(active), cy = y(p.score);
        const boxW = 96, boxH = 34, bx = Math.min(Math.max(cx - boxW / 2, PAD_L), W - PAD_R - boxW), by = Math.max(cy - boxH - 10, 2);
        return (
          <g>
            <line x1={cx} y1={PAD_T} x2={cx} y2={PAD_T + ih} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <rect x={bx} y={by} width={boxW} height={boxH} rx={7} fill="var(--surface)" stroke="var(--border)" />
            <text x={bx + 9} y={by + 14} fontSize="10" className="fill-muted-2">{fmtDay(p.date)}</text>
            <text x={bx + 9} y={by + 27} fontSize="13" fontWeight="800" fill={FLAG_META[flagFromScore(p.score)].color}>{p.score}<tspan className="fill-muted-2" fontSize="9" fontWeight="600"> / 100</tspan></text>
          </g>
        );
      })()}

      {/* Etichette asse X */}
      {labelIdx.map((i) => (
        <text key={`x-${i}`} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-muted-2" fontSize="9.5">{fmtDay(points[i].date)}</text>
      ))}
    </svg>
  );
}

/** Curva morbida (Catmull-Rom → Bézier). */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}
