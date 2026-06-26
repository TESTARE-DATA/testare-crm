"use client";

import { useRef, useState } from "react";
import { readinessTier } from "@/lib/readiness-core";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/overview/CountUp";

export interface TrendPoint { date: string; avg: number }

/**
 * Andamento della readiness media di squadra (≥14 giorni), INTERATTIVO:
 * passando il mouse compare un crosshair con tooltip sul giorno più vicino.
 * Linea che si "disegna" all'ingresso, area sfumata, ultimo punto = oggi.
 */
export function ReadinessTrendChart({ trend }: { trend: TrendPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (trend.length < 2) {
    return <div className="px-5 py-10 text-center text-sm text-muted">Storico readiness non disponibile.</div>;
  }

  const W = 720;
  const H = 210;
  const padX = 10;
  const padTop = 18;
  const padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const vals = trend.map((p) => p.avg);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 6) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 6) / 5) * 5);
  const span = Math.max(8, hi - lo);

  const x = (i: number) => padX + (i / (trend.length - 1)) * innerW;
  const y = (v: number) => padTop + (1 - (v - lo) / span) * innerH;

  const line = trend.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
  const area = `${line} L${x(trend.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

  const today = trend[trend.length - 1];
  const tier = readinessTier(today.avg);
  const delta = today.avg - trend[0].avg;
  const periodMin = Math.min(...vals);
  const periodMax = Math.max(...vals);

  const fmt = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const fmtLong = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const ticks = [0, Math.floor((trend.length - 1) / 2), trend.length - 1];

  const active = hover ?? trend.length - 1;
  const activePt = trend[active];
  const activeFrac = active / (trend.length - 1);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(frac * (trend.length - 1)));
  }

  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="text-5xl font-extrabold leading-none tracking-tight" style={{ color: tier.color }}>
            <CountUp value={today.avg} /><span className="text-2xl">%</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: tier.color, backgroundColor: tier.bg }}>
            <span className="dot-live h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tier.color }} /> {tier.level}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted">
          <span>Periodo <b className="tnum text-foreground">{trend.length} gg</b></span>
          <span>Min <b className="tnum text-foreground">{periodMin}%</b> · Max <b className="tnum text-foreground">{periodMax}%</b></span>
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: delta > 0 ? "var(--good)" : delta < 0 ? "var(--bad)" : "var(--muted)" }}>
            {delta !== 0 && <Icon name="trend" size={13} />}
            <span className="tnum">{delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</span> <span className="font-normal text-muted">vs inizio</span>
          </span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: "auto" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="rdTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tier.color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={tier.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[lo, lo + span / 2, hi].map((gv) => (
            <g key={gv}>
              <line x1={padX} y1={y(gv)} x2={W - padX} y2={y(gv)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" />
              <text x={padX} y={y(gv) - 4} fontSize="10" fill="var(--muted-2)">{Math.round(gv)}%</text>
            </g>
          ))}

          <path className="area-in" d={area} fill="url(#rdTrendFill)" />
          <path className="draw-line" d={line} pathLength={1} fill="none" stroke={tier.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair sul punto attivo */}
          {hover != null && (
            <line x1={x(active)} y1={padTop - 6} x2={x(active)} y2={padTop + innerH} stroke={tier.color} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          )}

          {trend.map((p, i) => {
            const isToday = i === trend.length - 1;
            const isActive = i === active && hover != null;
            const r = isActive ? 5.5 : isToday ? 5 : 2.4;
            return (
              <circle key={p.date} cx={x(i)} cy={y(p.avg)} r={r}
                fill={isActive || isToday ? tier.color : "var(--surface)"}
                stroke={tier.color} strokeWidth={isActive || isToday ? 2.5 : 1.5}
                style={{ transition: "r 0.12s" }} />
            );
          })}

          {ticks.map((i) => (
            <text key={i} x={x(i)} y={H - 8} fontSize="10" fill="var(--muted-2)" textAnchor={i === 0 ? "start" : i === trend.length - 1 ? "end" : "middle"}>
              {fmt(trend[i].date)}
            </text>
          ))}
        </svg>

        {/* Tooltip dinamico */}
        {hover != null && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-center shadow-lg"
            style={{ left: `${activeFrac * 100}%` }}
          >
            <div className="text-[10px] capitalize text-muted">{fmtLong(activePt.date)}</div>
            <div className="text-sm font-bold tnum" style={{ color: readinessTier(activePt.avg).color }}>{activePt.avg}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
