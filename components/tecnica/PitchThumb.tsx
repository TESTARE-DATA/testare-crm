import type { DrillConfig } from "@/lib/types";

// Mini diagramma di campo (stile lavagna tattica) generato in modo deterministico
// dal seed dell'esercizio: pallini giocatori + frecce di passaggio/movimento.

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function PitchThumb({ seed, drill, players = 6 }: { seed: string; drill?: DrillConfig; players?: number }) {
  const r = hash(seed);
  const W = 200, H = 120, P = 8;
  const n = Math.min(8, drill ? drill.playersPerTeam : players);

  const reds: [number, number][] = [];
  const blues: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    reds.push([P + 10 + r() * (W / 2 - 24), P + 10 + r() * (H - 28)]);
    blues.push([W / 2 + 6 + r() * (W / 2 - 24), P + 10 + r() * (H - 28)]);
  }
  // 2-3 frecce di passaggio tra pallini
  const arrows: [[number, number], [number, number]][] = [];
  const allPts = [...reds, ...blues];
  const nA = 2 + Math.floor(r() * 2);
  for (let i = 0; i < nA && allPts.length > 1; i++) {
    const a = allPts[Math.floor(r() * allPts.length)];
    const b = allPts[Math.floor(r() * allPts.length)];
    if (a !== b) arrows.push([a, b]);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <marker id={`ah-${seed}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#fff" /></marker>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#1f9d55" />
      <rect x="0" y="0" width={W} height={H} fill="#000" opacity="0.03" />
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.55" />
      <line x1={W / 2} y1={P} x2={W / 2} y2={H - P} stroke="#fff" strokeWidth="1.2" opacity="0.45" />
      <circle cx={W / 2} cy={H / 2} r="14" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.45" />
      {arrows.map((a, i) => (
        <line key={i} x1={a[0][0]} y1={a[0][1]} x2={a[1][0]} y2={a[1][1]} stroke="#fff" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.85" markerEnd={`url(#ah-${seed})`} />
      ))}
      {reds.map((p, i) => <circle key={`r${i}`} cx={p[0]} cy={p[1]} r="5" fill={drill?.teamAColor ?? "#e94f35"} stroke="#fff" strokeWidth="1" />)}
      {blues.map((p, i) => <circle key={`b${i}`} cx={p[0]} cy={p[1]} r="5" fill={drill?.teamBColor ?? "#1e6fb8"} stroke="#fff" strokeWidth="1" />)}
    </svg>
  );
}
