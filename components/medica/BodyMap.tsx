"use client";

import { useState } from "react";

// ============================================================================
// Omino per selezionare il distretto anatomico, basato sull'immagine
// public/omini.png (fronte a sinistra, retro a destra). Sopra la figura ci sono
// hotspot cliccabili invisibili, uno per distretto. Lato dx/sx dal punto di
// vista del GIOCATORE: di fronte la sua destra è alla nostra sinistra; di
// schiena la sua destra è alla nostra destra. Restituisce l'etichetta via onSelect.
// ============================================================================

type Spot = { label: string; x: number; y: number; w: number; h: number }; // % del riquadro

// FRONTE — viewer-sinistra = giocatore "dx"
const FRONT: Spot[] = [
  { label: "Testa", x: 41, y: 13, w: 18, h: 10 },
  { label: "Collo", x: 45, y: 22, w: 10, h: 4 },
  { label: "Spalla dx", x: 27, y: 25, w: 14, h: 8 },
  { label: "Spalla sx", x: 59, y: 25, w: 14, h: 8 },
  { label: "Torace / pettorali", x: 37, y: 27, w: 26, h: 12 },
  { label: "Braccio dx", x: 20, y: 31, w: 13, h: 19 },
  { label: "Braccio sx", x: 67, y: 31, w: 13, h: 19 },
  { label: "Mano dx", x: 11, y: 51, w: 13, h: 8 },
  { label: "Mano sx", x: 76, y: 51, w: 13, h: 8 },
  { label: "Addome / core", x: 40, y: 39, w: 20, h: 11 },
  { label: "Inguine / pube", x: 44, y: 50, w: 12, h: 5 },
  { label: "Coscia ant. dx", x: 38, y: 55, w: 12, h: 14 },
  { label: "Coscia ant. sx", x: 50, y: 55, w: 12, h: 14 },
  { label: "Ginocchio dx", x: 39, y: 69, w: 11, h: 6 },
  { label: "Ginocchio sx", x: 50, y: 69, w: 11, h: 6 },
  { label: "Tibia / stinco dx", x: 40, y: 75, w: 10, h: 12 },
  { label: "Tibia / stinco sx", x: 50, y: 75, w: 10, h: 12 },
  { label: "Caviglia / piede dx", x: 38, y: 87, w: 12, h: 8 },
  { label: "Caviglia / piede sx", x: 50, y: 87, w: 12, h: 8 },
];

// RETRO — viewer-sinistra = giocatore "sx", viewer-destra = "dx"
const BACK: Spot[] = [
  { label: "Nuca / cervicale", x: 41, y: 13, w: 18, h: 10 },
  { label: "Collo (cervicale)", x: 45, y: 22, w: 10, h: 4 },
  { label: "Spalla sx", x: 27, y: 25, w: 14, h: 8 },
  { label: "Spalla dx", x: 59, y: 25, w: 14, h: 8 },
  { label: "Schiena alta / dorsale", x: 37, y: 27, w: 26, h: 11 },
  { label: "Braccio sx", x: 20, y: 31, w: 13, h: 19 },
  { label: "Braccio dx", x: 67, y: 31, w: 13, h: 19 },
  { label: "Mano sx", x: 11, y: 51, w: 13, h: 8 },
  { label: "Mano dx", x: 76, y: 51, w: 13, h: 8 },
  { label: "Zona lombare", x: 40, y: 39, w: 20, h: 9 },
  { label: "Gluteo sx", x: 38, y: 48, w: 12, h: 8 },
  { label: "Gluteo dx", x: 50, y: 48, w: 12, h: 8 },
  { label: "Coscia post. sx", x: 38, y: 57, w: 12, h: 12 },
  { label: "Coscia post. dx", x: 50, y: 57, w: 12, h: 12 },
  { label: "Cavo popliteo sx", x: 39, y: 70, w: 11, h: 5 },
  { label: "Cavo popliteo dx", x: 50, y: 70, w: 11, h: 5 },
  { label: "Polpaccio sx", x: 40, y: 75, w: 10, h: 12 },
  { label: "Polpaccio dx", x: 50, y: 75, w: 10, h: 12 },
  { label: "Tendine d'Achille sx", x: 41, y: 87, w: 9, h: 8 },
  { label: "Tendine d'Achille dx", x: 50, y: 87, w: 9, h: 8 },
];

export function BodyMap({ value, onSelect }: { value: string | null; onSelect: (label: string) => void }) {
  const [view, setView] = useState<"fronte" | "retro">("fronte");
  const spots = view === "fronte" ? FRONT : BACK;

  return (
    <div className="flex flex-col items-center">
      <style>{`
        .hot { position:absolute; background: transparent; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: background .12s, border-color .12s; }
        .hot:hover { background: color-mix(in srgb, var(--brand-primary) 22%, transparent); border-color: color-mix(in srgb, var(--brand-primary) 55%, transparent); }
        .hot.sel { background: color-mix(in srgb, var(--brand-primary) 45%, transparent); border-color: var(--brand-primary); }
        .side2 { font: 800 10px ui-sans-serif, system-ui; letter-spacing: .14em; color: var(--muted-2); opacity: .7; }
      `}</style>

      <div className="mb-3 flex rounded-xl border border-border bg-surface p-0.5">
        {(["fronte", "retro"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-4 py-1 text-[12px] font-semibold capitalize transition-colors ${view === v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      {/* indicatori lato (prospettiva del giocatore) */}
      <div className="flex w-[210px] justify-between px-2">
        <span className="side2">{view === "fronte" ? "DX" : "SX"}</span>
        <span className="side2">{view === "fronte" ? "SX" : "DX"}</span>
      </div>

      <div
        className="relative select-none"
        style={{ width: 210, height: 420, backgroundImage: "url(/omini.png)", backgroundSize: "200% 100%", backgroundPositionX: view === "fronte" ? "0%" : "100%", backgroundRepeat: "no-repeat" }}
      >
        {spots.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.label}
            aria-label={s.label}
            onClick={() => onSelect(s.label)}
            className={`hot ${value === s.label ? "sel" : ""}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
          />
        ))}
      </div>

      <div className="mt-2 min-h-[20px] text-center text-[13px]">
        {value ? (
          <span className="font-semibold">Zona: <span className="brand-text">{value}</span></span>
        ) : (
          <span className="text-muted-2">Tocca una zona sull&apos;omino</span>
        )}
      </div>
    </div>
  );
}
