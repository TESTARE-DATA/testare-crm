"use client";

import { useState } from "react";

// ============================================================================
// Omino: immagine line-art (public/omino.jpg, 597x2095, fronte sopra / retro
// sotto) dentro un SVG, con i POLIGONI dei distretti sopra ogni segmento. Il
// browser fa l'hit-test esatto della forma → localizzazione precisa al pixel,
// a qualsiasi dimensione. Lato dx/sx dal punto di vista del giocatore.
// ============================================================================

const IMG_W = 597, IMG_H = 2095;
const FRONT_VB = `0 0 ${IMG_W} 1047`;
const BACK_VB = `0 1047 ${IMG_W} 1048`;
const DEBUG = false; // metti true per vedere i poligoni (calibrazione)

type Region = { label: string; points: string };

const FRONT: Region[] = [
  { label: "Testa", points: "260,55 338,55 352,140 332,195 266,195 246,140" },
  { label: "Collo", points: "272,195 326,195 334,238 264,238" },
  { label: "Spalla dx", points: "150,235 236,252 232,322 150,320" },
  { label: "Spalla sx", points: "362,252 448,235 448,320 366,322" },
  { label: "Torace / pettorali", points: "236,252 362,252 368,360 300,392 230,360" },
  { label: "Braccio dx", points: "118,308 200,330 196,470 108,460" },
  { label: "Braccio sx", points: "398,330 480,308 490,460 402,470" },
  { label: "Avambraccio dx", points: "92,458 172,470 150,612 72,600" },
  { label: "Avambraccio sx", points: "426,470 506,458 526,600 448,612" },
  { label: "Mano dx", points: "55,600 150,612 140,706 42,694" },
  { label: "Mano sx", points: "448,612 543,600 556,694 458,706" },
  { label: "Addome / core", points: "236,360 362,360 360,560 238,560" },
  { label: "Inguine / pube", points: "256,558 342,558 322,652 276,652" },
  { label: "Coscia ant. dx", points: "204,576 298,600 298,812 214,812" },
  { label: "Coscia ant. sx", points: "300,600 394,576 384,812 300,812" },
  { label: "Ginocchio dx", points: "214,812 298,812 296,878 218,878" },
  { label: "Ginocchio sx", points: "300,812 384,812 380,878 304,878" },
  { label: "Gamba / tibia dx", points: "222,878 296,878 286,978 228,978" },
  { label: "Gamba / tibia sx", points: "304,878 378,878 372,978 296,978" },
  { label: "Piede dx", points: "216,978 292,978 288,1018 208,1012" },
  { label: "Piede sx", points: "308,978 384,978 392,1012 312,1018" },
];

const BACK: Region[] = [
  { label: "Nuca / cervicale", points: "262,1095 336,1095 350,1180 328,1238 270,1238 248,1180" },
  { label: "Collo (cervicale)", points: "272,1238 326,1238 334,1282 264,1282" },
  { label: "Spalla sx", points: "150,1292 236,1304 232,1374 150,1372" },
  { label: "Spalla dx", points: "362,1304 448,1292 448,1372 366,1374" },
  { label: "Schiena alta / dorsale", points: "236,1304 362,1304 358,1448 240,1448" },
  { label: "Braccio sx", points: "118,1362 200,1384 196,1524 108,1514" },
  { label: "Braccio dx", points: "398,1384 480,1362 490,1514 402,1524" },
  { label: "Avambraccio sx", points: "92,1512 172,1524 150,1666 72,1654" },
  { label: "Avambraccio dx", points: "426,1524 506,1512 526,1654 448,1666" },
  { label: "Mano sx", points: "55,1654 150,1666 140,1760 42,1748" },
  { label: "Mano dx", points: "448,1666 543,1654 556,1748 458,1760" },
  { label: "Zona lombare", points: "244,1448 354,1448 350,1568 248,1568" },
  { label: "Gluteo sx", points: "246,1568 300,1568 306,1690 248,1700" },
  { label: "Gluteo dx", points: "300,1568 354,1568 352,1700 294,1690" },
  { label: "Coscia post. sx", points: "230,1690 298,1700 296,1888 240,1888" },
  { label: "Coscia post. dx", points: "302,1700 372,1690 362,1888 304,1888" },
  { label: "Polpaccio sx", points: "240,1900 296,1900 286,2012 248,2012" },
  { label: "Polpaccio dx", points: "304,1900 360,1900 352,2012 314,2012" },
  { label: "Caviglia / piede sx", points: "246,2012 292,2012 288,2062 240,2056" },
  { label: "Caviglia / piede dx", points: "308,2012 354,2012 360,2056 314,2062" },
];

type Parsed = { label: string; pts: [number, number][] };
const parse = (regs: Region[]): Parsed[] => regs.map((r) => ({ label: r.label, pts: r.points.split(" ").map((p) => p.split(",").map(Number) as [number, number]) }));
const FRONT_P = parse(FRONT), BACK_P = parse(BACK);

function inPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const centroid = (pts: [number, number][]): [number, number] => {
  const n = pts.length;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
};

export function BodyMap({ value, onSelect }: { value: string | null; onSelect: (label: string) => void }) {
  const [view, setView] = useState<"fronte" | "retro">("fronte");
  const [hover, setHover] = useState<string | null>(null);
  const regions = view === "fronte" ? FRONT : BACK;
  const parsed = view === "fronte" ? FRONT_P : BACK_P;

  // distretto sotto al punto: prima chi lo CONTIENE, altrimenti il centro più vicino
  const pick = (e: React.MouseEvent<SVGSVGElement>): string => {
    const svg = e.currentTarget;
    const sp = svg.createSVGPoint(); sp.x = e.clientX; sp.y = e.clientY;
    const p = sp.matrixTransform(svg.getScreenCTM()!.inverse());
    for (const r of parsed) if (inPoly(p.x, p.y, r.pts)) return r.label;
    let best = parsed[0].label, bd = Infinity;
    for (const r of parsed) { const [cx, cy] = centroid(r.pts); const d = (p.x - cx) ** 2 + (p.y - cy) ** 2; if (d < bd) { bd = d; best = r.label; } }
    return best;
  };

  return (
    <div className="flex flex-col items-center">
      <style>{`
        .reg { fill: transparent; stroke: transparent; stroke-width: 2.5; transition: fill .1s; }
        ${DEBUG ? ".reg { fill: color-mix(in srgb, var(--brand-primary) 12%, transparent); stroke: color-mix(in srgb, var(--brand-primary) 35%, transparent); }" : ""}
        .reg.hov { fill: color-mix(in srgb, var(--brand-primary) 28%, transparent); stroke: color-mix(in srgb, var(--brand-primary) 60%, transparent); }
        .reg.sel { fill: color-mix(in srgb, var(--brand-primary) 48%, transparent); stroke: var(--brand-primary); }
      `}</style>

      <div className="mb-3 flex rounded-xl border border-border bg-surface p-0.5">
        {(["fronte", "retro"] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); setHover(null); }} className={`rounded-lg px-4 py-1 text-[12px] font-semibold capitalize transition-colors ${view === v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="flex justify-between" style={{ width: 200 }}>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "DX" : "SX"}</span>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "SX" : "DX"}</span>
      </div>

      <svg
        viewBox={view === "fronte" ? FRONT_VB : BACK_VB}
        className="h-[360px] w-auto cursor-pointer select-none"
        onMouseMove={(e) => setHover(pick(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onSelect(pick(e))}
      >
        <image href="/omino.jpg" x={0} y={0} width={IMG_W} height={IMG_H} />
        {regions.map((r) => (
          <polygon key={r.label} className={`reg ${value === r.label ? "sel" : hover === r.label ? "hov" : ""}`} points={r.points} style={{ pointerEvents: "none" }} />
        ))}
      </svg>

      <div className="mt-2 min-h-[20px] text-center text-[13px]">
        {hover && hover !== value ? (
          <span className="text-muted">→ <span className="font-semibold text-foreground">{hover}</span></span>
        ) : value ? (
          <span className="font-semibold">Zona: <span className="brand-text">{value}</span></span>
        ) : (
          <span className="text-muted-2">Tocca una zona sull&apos;omino</span>
        )}
      </div>
    </div>
  );
}
