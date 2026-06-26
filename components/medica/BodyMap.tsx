"use client";

import { useState } from "react";

// ============================================================================
// Omino "segna-punto": l'utente clicca un PUNTO esatto sull'immagine line-art
// (public/omino.jpg, 597x2095, fronte sopra / retro sotto). Il punto coincide
// sempre col clic. Il DISTRETTO viene derivato in automatico (centro più
// vicino) come etichetta per la cartella; il dettaglio fine va nelle note.
// Lato dx/sx dal punto di vista del giocatore (di fronte sx=nostra destra,
// di schiena invertito) — già incluso nelle etichette dei centri.
// ============================================================================

const IMG_W = 597, IMG_H = 2095;
const FRONT_VB = `0 0 ${IMG_W} 1047`;
const BACK_VB = `0 1047 ${IMG_W} 1048`;

type C = { label: string; x: number; y: number };

const FRONT_C: C[] = [
  { label: "Testa", x: 300, y: 120 }, { label: "Collo", x: 300, y: 216 },
  { label: "Spalla dx", x: 192, y: 285 }, { label: "Spalla sx", x: 406, y: 285 },
  { label: "Torace / pettorali", x: 300, y: 320 },
  { label: "Braccio dx", x: 155, y: 390 }, { label: "Braccio sx", x: 443, y: 390 },
  { label: "Avambraccio dx", x: 122, y: 535 }, { label: "Avambraccio sx", x: 476, y: 535 },
  { label: "Mano dx", x: 97, y: 655 }, { label: "Mano sx", x: 500, y: 655 },
  { label: "Addome / core", x: 300, y: 460 }, { label: "Inguine / pube", x: 300, y: 605 },
  { label: "Coscia ant. dx", x: 256, y: 700 }, { label: "Coscia ant. sx", x: 344, y: 700 },
  { label: "Ginocchio dx", x: 256, y: 845 }, { label: "Ginocchio sx", x: 344, y: 845 },
  { label: "Gamba / tibia dx", x: 258, y: 928 }, { label: "Gamba / tibia sx", x: 342, y: 928 },
  { label: "Piede dx", x: 252, y: 998 }, { label: "Piede sx", x: 348, y: 998 },
];

const BACK_C: C[] = [
  { label: "Nuca / cervicale", x: 300, y: 1166 }, { label: "Collo (cervicale)", x: 300, y: 1260 },
  { label: "Spalla sx", x: 192, y: 1333 }, { label: "Spalla dx", x: 406, y: 1333 },
  { label: "Schiena alta / dorsale", x: 300, y: 1376 },
  { label: "Braccio sx", x: 155, y: 1443 }, { label: "Braccio dx", x: 443, y: 1443 },
  { label: "Avambraccio sx", x: 122, y: 1589 }, { label: "Avambraccio dx", x: 476, y: 1589 },
  { label: "Mano sx", x: 97, y: 1707 }, { label: "Mano dx", x: 500, y: 1707 },
  { label: "Zona lombare", x: 300, y: 1508 },
  { label: "Gluteo sx", x: 270, y: 1630 }, { label: "Gluteo dx", x: 330, y: 1630 },
  { label: "Coscia post. sx", x: 266, y: 1790 }, { label: "Coscia post. dx", x: 334, y: 1790 },
  { label: "Polpaccio sx", x: 268, y: 1956 }, { label: "Polpaccio dx", x: 332, y: 1956 },
  { label: "Caviglia / piede sx", x: 268, y: 2035 }, { label: "Caviglia / piede dx", x: 332, y: 2035 },
];

export type BodySel = { label: string; view: "fronte" | "retro"; x: number; y: number };

export function BodyMap({ value, onSelect }: { value: BodySel | null; onSelect: (s: BodySel) => void }) {
  const [view, setView] = useState<"fronte" | "retro">("fronte");
  const centers = view === "fronte" ? FRONT_C : BACK_C;

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const sp = svg.createSVGPoint(); sp.x = e.clientX; sp.y = e.clientY;
    const p = sp.matrixTransform(svg.getScreenCTM()!.inverse());
    let best = centers[0].label, bd = Infinity;
    for (const c of centers) { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = c.label; } }
    onSelect({ label: best, view, x: Math.round(p.x), y: Math.round(p.y) });
  };

  const pin = value && value.view === view ? value : null;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex rounded-xl border border-border bg-surface p-0.5">
        {(["fronte", "retro"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-4 py-1 text-[12px] font-semibold capitalize transition-colors ${view === v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="flex justify-between" style={{ width: 200 }}>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "DX" : "SX"}</span>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "SX" : "DX"}</span>
      </div>

      <svg viewBox={view === "fronte" ? FRONT_VB : BACK_VB} className="h-[360px] w-auto cursor-crosshair select-none" onClick={onSvgClick}>
        <image href="/omino.jpg" x={0} y={0} width={IMG_W} height={IMG_H} />
        {pin && (
          <g style={{ pointerEvents: "none" }}>
            <circle cx={pin.x} cy={pin.y} r={26} fill="color-mix(in srgb, var(--brand-primary) 22%, transparent)" />
            <circle cx={pin.x} cy={pin.y} r={12} fill="var(--brand-primary)" stroke="#fff" strokeWidth={4} />
          </g>
        )}
      </svg>

      <div className="mt-2 min-h-[20px] text-center text-[13px]">
        {value ? (
          <span className="font-semibold">Zona: <span className="brand-text">{value.label}</span></span>
        ) : (
          <span className="text-muted-2">Tocca il punto esatto sull&apos;omino</span>
        )}
      </div>
    </div>
  );
}
