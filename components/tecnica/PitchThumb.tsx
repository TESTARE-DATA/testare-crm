import type { DrillConfig, DrillEntity } from "@/lib/types";

// Mini-lavagna: anteprima REALE dell'esercizio dalle posizioni e frecce salvate
// (coordinate normalizzate). Se mancano le entità, dispone i giocatori a griglia.

const W = 200, H = 120, P = 9;
const px = (along: number, across: number): [number, number] => [P + along * (W - 2 * P), P + across * (H - 2 * P)];
const colorFor = (k: DrillEntity["kind"], d: DrillConfig) => k === "A" ? d.teamAColor : k === "B" ? d.teamBColor : "#facc15";

function fallbackEntities(d: DrillConfig): DrillEntity[] {
  const grid = (n: number, a0: number, a1: number): [number, number][] => {
    const c = Math.ceil(Math.sqrt(Math.max(1, n))), r = Math.ceil(Math.max(1, n) / c);
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) { const cc = i % c, rr = Math.floor(i / c); out.push([a0 + ((cc + 1) / (c + 1)) * (a1 - a0), (rr + 1) / (r + 1)]); }
    return out;
  };
  const out: DrillEntity[] = [];
  grid(d.playersPerTeam, 0.05, 0.45).forEach(([x, y], i) => out.push({ id: `A${i}`, kind: "A", x, y, label: `${i + 1}` }));
  grid(d.playersB ?? d.playersPerTeam, 0.55, 0.95).forEach(([x, y], i) => out.push({ id: `B${i}`, kind: "B", x, y, label: `${i + 1}` }));
  return out;
}

export function PitchThumb({ drill }: { drill: DrillConfig }) {
  const entities = drill.entities && drill.entities.length ? drill.entities : fallbackEntities(drill);
  const arrows = drill.arrows ?? [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <marker id="thumb-ah" markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L5,2.5 L0,5 Z" fill="#fff" /></marker>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#1f9d55" />
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.5" />
      <line x1={W / 2} y1={P} x2={W / 2} y2={H - P} stroke="#fff" strokeWidth="1.1" opacity="0.4" />
      <circle cx={W / 2} cy={H / 2} r="13" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.4" />
      {arrows.map((a) => {
        const [x1, y1] = px(a.x1, a.y1), [x2, y2] = px(a.x2, a.y2);
        return <line key={a.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeDasharray={a.kind === "passaggio" ? "4 3" : undefined} opacity="0.92" markerEnd="url(#thumb-ah)" />;
      })}
      {entities.map((e) => {
        const [x, y] = px(e.x, e.y);
        if (e.kind === "ball") return <circle key={e.id} cx={x} cy={y} r="2.6" fill="#fff" stroke="#0b0b0c" strokeWidth="0.6" />;
        return <circle key={e.id} cx={x} cy={y} r="4.6" fill={colorFor(e.kind, drill)} stroke="#fff" strokeWidth="1" />;
      })}
    </svg>
  );
}
