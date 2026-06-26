"use client";

import { useRef, useState } from "react";

// ============================================================================
// Omino su immagine anatomica reale (public/omini.png: fronte a sx, retro a dx).
// Localizzazione robusta: NON usa hotspot sovrapposti (che intercettavano il
// clic sbagliato), ma seleziona il distretto il cui CENTRO è più vicino al punto
// cliccato (distanza in pixel). Anteprima al passaggio del mouse.
// Lato dx/sx dal punto di vista del GIOCATORE: di fronte la sua destra è alla
// nostra sinistra; di schiena è alla nostra destra.
// ============================================================================

type Spot = { label: string; x: number; y: number; w: number; h: number }; // % del riquadro (centro = clic + velo selezione)

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
  { label: "Caviglia / piede dx", x: 38, y: 87, w: 12, h: 9 },
  { label: "Caviglia / piede sx", x: 50, y: 87, w: 12, h: 9 },
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

const W = 210, H = 420;

export function BodyMap({ value, onSelect }: { value: string | null; onSelect: (label: string) => void }) {
  const [view, setView] = useState<"fronte" | "retro">("fronte");
  const [hover, setHover] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const spots = view === "fronte" ? FRONT : BACK;

  // distretto col centro più vicino al punto (distanza in pixel reali)
  const nearest = (clientX: number, clientY: number): Spot | null => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    const px = clientX - r.left, py = clientY - r.top;
    let best: Spot | null = null, bd = Infinity;
    for (const s of spots) {
      const cx = ((s.x + s.w / 2) / 100) * r.width;
      const cy = ((s.y + s.h / 2) / 100) * r.height;
      const d = (px - cx) ** 2 + (py - cy) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex rounded-xl border border-border bg-surface p-0.5">
        {(["fronte", "retro"] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); setHover(null); }} className={`rounded-lg px-4 py-1 text-[12px] font-semibold capitalize transition-colors ${view === v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="flex justify-between" style={{ width: W }}>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "DX" : "SX"}</span>
        <span className="px-2 text-[10px] font-extrabold tracking-[0.14em] text-muted-2 opacity-70">{view === "fronte" ? "SX" : "DX"}</span>
      </div>

      <div
        ref={boxRef}
        className="relative cursor-pointer select-none"
        style={{ width: W, height: H, backgroundImage: "url(/omini.png)", backgroundSize: "200% 100%", backgroundPositionX: view === "fronte" ? "0%" : "100%", backgroundRepeat: "no-repeat" }}
        onMouseMove={(e) => setHover(nearest(e.clientX, e.clientY)?.label ?? null)}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => { const s = nearest(e.clientX, e.clientY); if (s) onSelect(s.label); }}
      >
        {spots.map((s) => {
          const sel = value === s.label;
          const hov = hover === s.label;
          if (!sel && !hov) return null;
          return (
            <div
              key={s.label}
              style={{
                position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%`,
                borderRadius: 12, pointerEvents: "none", transition: "background .1s",
                background: sel ? "color-mix(in srgb, var(--brand-primary) 46%, transparent)" : "color-mix(in srgb, var(--brand-primary) 20%, transparent)",
                border: sel ? "2px solid var(--brand-primary)" : "2px solid color-mix(in srgb, var(--brand-primary) 45%, transparent)",
              }}
            />
          );
        })}
      </div>

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
