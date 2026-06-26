import type { PhysicalKpi } from "@/lib/types";

const AXES: { key: keyof PhysicalKpi; label: string }[] = [
  { key: "forza", label: "Forza" },
  { key: "potenza", label: "Potenza" },
  { key: "reattivita", label: "Reattività" },
  { key: "simmetria", label: "Simmetrie" },
];

/** Radar SVG a 4 assi per le KPI (percentili 0–100). Overlay opzionali:
 *  - prev: sessione precedente (ghost tratteggiato)
 *  - team: media squadra (linea accent) per posizionare l'atleta nel gruppo. */
export function KpiRadar({ kpi, prev, team, size = 230 }: { kpi: PhysicalKpi; prev?: PhysicalKpi; team?: PhysicalKpi; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const n = AXES.length;

  const point = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (k: PhysicalKpi) => AXES.map((ax, i) => point(i, (k[ax.key] / 100) * R).join(",")).join(" ");

  const grid = [0.25, 0.5, 0.75, 1];
  const dataPts = AXES.map((ax, i) => point(i, (kpi[ax.key] / 100) * R));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {grid.map((g, gi) => (
        <polygon key={gi} points={AXES.map((_, i) => point(i, R * g).join(",")).join(" ")} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}

      {team && <polygon points={poly(team)} fill="none" stroke="var(--brand-accent)" strokeWidth={1.6} opacity={0.85} />}
      {prev && <polygon points={poly(prev)} fill="none" stroke="var(--muted-2)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />}

      <polygon points={poly(kpi)} fill="var(--brand-primary)" fillOpacity={0.18} stroke="var(--brand-primary)" strokeWidth={2.2} />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="var(--brand-primary)" />
      ))}

      {AXES.map((ax, i) => {
        const [x, y] = point(i, R + 20);
        return (
          <text key={ax.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

export { AXES as KPI_AXES };
