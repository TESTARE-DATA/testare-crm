"use client";

import { useId, useState } from "react";
import type { PhysicalKpi } from "@/lib/types";

const AXES: { key: keyof PhysicalKpi; label: string }[] = [
  { key: "forza", label: "Forza" },
  { key: "potenza", label: "Potenza" },
  { key: "reattivita", label: "Reattività" },
  { key: "simmetria", label: "Simmetrie" },
];

type LineId = "attuale" | "precedente" | "team";

/** Radar KPI interattivo, alto livello: scala 0–100 leggibile, anelli a fasce,
 *  area sfumata, hover sui valori e toggle delle linee. */
export function InteractiveRadar({ kpi, prev, team, size = 320 }: { kpi: PhysicalKpi; prev?: PhysicalKpi; team?: PhysicalKpi; size?: number }) {
  const gid = useId().replace(/:/g, "");
  const [visible, setVisible] = useState<Record<LineId, boolean>>({ attuale: true, precedente: true, team: true });
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number; color: string } | null>(null);

  const cx = size / 2, cy = size / 2, R = size / 2 - 46, n = AXES.length;
  const RINGS = [20, 40, 60, 80, 100];
  const point = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  };
  const poly = (k: PhysicalKpi) => AXES.map((ax, i) => point(i, (k[ax.key] / 100) * R).join(",")).join(" ");

  const lines: { id: LineId; data?: PhysicalKpi; color: string; label: string; dashed?: boolean; fill?: boolean }[] = [
    { id: "team", data: team, color: "var(--brand-accent)", label: "Media squadra" },
    { id: "precedente", data: prev, color: "var(--muted-2)", label: "Precedente", dashed: true },
    { id: "attuale", data: kpi, color: "var(--brand-primary)", label: "Attuale", fill: true },
  ];

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <radialGradient id={`radarFill-${gid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.06" />
            </radialGradient>
          </defs>

          {/* anelli a fasce alternate */}
          {RINGS.map((g, gi) => (
            <polygon
              key={g}
              points={AXES.map((_, i) => point(i, (R * g) / 100).join(",")).join(" ")}
              fill={gi % 2 === 0 ? "color-mix(in srgb, var(--muted-2) 6%, transparent)" : "transparent"}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          {/* assi */}
          {AXES.map((_, i) => { const [x, y] = point(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />; })}

          {/* etichette di scala sull'asse verticale (alto) */}
          {RINGS.map((g) => {
            const [x, y] = point(0, (R * g) / 100);
            return (
              <text key={`s-${g}`} x={x + 4} y={y + 3} className="fill-muted-2" style={{ fontSize: 9, fontWeight: 600 }}>{g}</text>
            );
          })}

          {/* poligoni dati */}
          {lines.filter((l) => l.data && visible[l.id]).map((l) => (
            <polygon
              key={l.id}
              points={poly(l.data!)}
              fill={l.fill ? `url(#radarFill-${gid})` : "none"}
              stroke={l.color}
              strokeWidth={l.fill ? 2.6 : 1.8}
              strokeLinejoin="round"
              strokeDasharray={l.dashed ? "5 4" : undefined}
              opacity={l.dashed ? 0.8 : 1}
              style={{ transition: "all 0.3s ease" }}
            />
          ))}

          {/* punti interattivi */}
          {lines.filter((l) => l.data && visible[l.id]).flatMap((l) =>
            AXES.map((ax, i) => {
              const [x, y] = point(i, (l.data![ax.key] / 100) * R);
              return (
                <circle key={`${l.id}-${ax.key}`} cx={x} cy={y} r={l.fill ? 5.5 : 4.5} fill={l.color} stroke="#fff" strokeWidth={1.5}
                  onMouseEnter={() => setHover({ x, y, label: `${ax.label} · ${l.label}`, value: l.data![ax.key], color: l.color })}
                  onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
              );
            }),
          )}

          {/* etichette assi con valore attuale */}
          {AXES.map((ax, i) => {
            const [x, y] = point(i, R + 26);
            return (
              <g key={ax.key}>
                <text x={x} y={y - 5} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 12, fontWeight: 700 }}>{ax.label}</text>
                <text x={x} y={y + 9} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fontWeight: 800, fill: "var(--brand-primary)" }}>{kpi[ax.key]}°</text>
              </g>
            );
          })}
        </svg>

        {hover && (
          <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg" style={{ left: hover.x, top: hover.y - 10 }}>
            <span>{hover.label}: </span><span style={{ color: hover.color === "var(--muted-2)" ? "#cbd5e1" : "#fff" }}>{hover.value}°</span>
          </div>
        )}
      </div>

      {/* Toggle linee */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {lines.slice().reverse().filter((l) => l.data).map((l) => (
          <button key={l.id} onClick={() => setVisible((v) => ({ ...v, [l.id]: !v[l.id] }))} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-opacity ${visible[l.id] ? "border-border" : "border-dashed border-border opacity-45"}`}>
            <span className="h-0 w-3.5 border-t-2" style={{ borderColor: l.color, borderStyle: l.dashed ? "dashed" : "solid" }} />
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
