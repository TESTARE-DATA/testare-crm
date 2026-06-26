"use client";

import { useState } from "react";

// ============================================================================
// Omino per selezionare il distretto anatomico. Silhouette grigia "piena" e
// segmentata (stile scheda medica), vista fronte/retro, regioni cliccabili.
// Lato destro/sinistro dal punto di vista del GIOCATORE (la sua destra è alla
// nostra sinistra). Restituisce l'etichetta del distretto via onSelect.
// ============================================================================

export function BodyMap({ value, onSelect }: { value: string | null; onSelect: (label: string) => void }) {
  const [view, setView] = useState<"fronte" | "retro">("fronte");

  // Il fill è ereditato dalle shape figlie (che non hanno un fill proprio),
  // così hover/selezione si applicano via CSS.
  const Zone = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <g className={`bz ${value === label ? "is-sel" : ""}`} onClick={() => onSelect(label)} role="button" aria-label={label}>
      {children}
      <title>{label}</title>
    </g>
  );

  return (
    <div className="flex flex-col items-center">
      <style>{`
        .bodymap .bz { fill: #9aa1ac; stroke: #404754; stroke-width: 1.4; stroke-linejoin: round; cursor: pointer; transition: fill .12s ease; }
        .bodymap .bz:hover { fill: color-mix(in srgb, var(--brand-primary) 42%, #9aa1ac); }
        .bodymap .bz.is-sel { fill: var(--brand-primary); stroke: color-mix(in srgb, var(--brand-primary) 55%, #000); }
        .bodymap .side { fill: var(--muted-2); font: 800 9px ui-sans-serif, system-ui; letter-spacing: .14em; opacity: .65; }
      `}</style>

      <div className="mb-3 flex rounded-xl border border-border bg-surface p-0.5">
        {(["fronte", "retro"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-4 py-1 text-[12px] font-semibold capitalize transition-colors ${view === v ? "brand-bg brand-on" : "text-muted hover:text-foreground"}`}>
            {v}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 200 446" className="bodymap h-[348px] w-auto select-none">
        <text x="30" y="58" className="side">DX</text>
        <text x="158" y="58" className="side" textAnchor="end">SX</text>

        {view === "fronte" ? (
          <>
            <Zone label="Testa"><ellipse cx="100" cy="28" rx="19" ry="22" /></Zone>
            <Zone label="Collo"><rect x="91" y="46" width="18" height="15" rx="4" /></Zone>
            <Zone label="Spalla dx"><ellipse cx="65" cy="80" rx="18" ry="15" /></Zone>
            <Zone label="Spalla sx"><ellipse cx="135" cy="80" rx="18" ry="15" /></Zone>
            <Zone label="Torace / pettorali"><rect x="63" y="66" width="74" height="48" rx="20" /></Zone>
            <Zone label="Braccio dx"><rect x="40" y="82" width="20" height="120" rx="10" /></Zone>
            <Zone label="Braccio sx"><rect x="140" y="82" width="20" height="120" rx="10" /></Zone>
            <Zone label="Mano dx"><ellipse cx="47" cy="214" rx="10" ry="12" /></Zone>
            <Zone label="Mano sx"><ellipse cx="153" cy="214" rx="10" ry="12" /></Zone>
            <Zone label="Addome / core"><rect x="69" y="108" width="62" height="54" rx="16" /></Zone>
            <Zone label="Inguine / pube"><path d="M84 162 H116 L100 188 Z" /></Zone>
            <Zone label="Coscia ant. dx"><rect x="67" y="172" width="28" height="92" rx="13" /></Zone>
            <Zone label="Coscia ant. sx"><rect x="105" y="172" width="28" height="92" rx="13" /></Zone>
            <Zone label="Ginocchio dx"><ellipse cx="84" cy="272" rx="15" ry="13" /></Zone>
            <Zone label="Ginocchio sx"><ellipse cx="116" cy="272" rx="15" ry="13" /></Zone>
            <Zone label="Tibia / stinco dx"><rect x="74" y="286" width="20" height="84" rx="10" /></Zone>
            <Zone label="Tibia / stinco sx"><rect x="106" y="286" width="20" height="84" rx="10" /></Zone>
            <Zone label="Caviglia / piede dx"><path d="M71 372 h23 v10 l10 9 v7 H71 Z" /></Zone>
            <Zone label="Caviglia / piede sx"><path d="M129 372 h-23 v10 l-10 9 v7 H129 Z" /></Zone>
          </>
        ) : (
          <>
            <Zone label="Nuca / cervicale"><ellipse cx="100" cy="28" rx="19" ry="22" /></Zone>
            <Zone label="Collo (cervicale)"><rect x="91" y="46" width="18" height="15" rx="4" /></Zone>
            <Zone label="Spalla dx"><ellipse cx="135" cy="80" rx="18" ry="15" /></Zone>
            <Zone label="Spalla sx"><ellipse cx="65" cy="80" rx="18" ry="15" /></Zone>
            <Zone label="Schiena alta / dorsale"><rect x="63" y="66" width="74" height="50" rx="20" /></Zone>
            <Zone label="Braccio dx"><rect x="140" y="82" width="20" height="120" rx="10" /></Zone>
            <Zone label="Braccio sx"><rect x="40" y="82" width="20" height="120" rx="10" /></Zone>
            <Zone label="Zona lombare"><rect x="69" y="112" width="62" height="42" rx="14" /></Zone>
            <Zone label="Gluteo dx"><ellipse cx="84" cy="170" rx="20" ry="17" /></Zone>
            <Zone label="Gluteo sx"><ellipse cx="116" cy="170" rx="20" ry="17" /></Zone>
            <Zone label="Coscia post. dx"><rect x="67" y="186" width="28" height="86" rx="13" /></Zone>
            <Zone label="Coscia post. sx"><rect x="105" y="186" width="28" height="86" rx="13" /></Zone>
            <Zone label="Cavo popliteo dx"><ellipse cx="84" cy="278" rx="13" ry="10" /></Zone>
            <Zone label="Cavo popliteo sx"><ellipse cx="116" cy="278" rx="13" ry="10" /></Zone>
            <Zone label="Polpaccio dx"><rect x="74" y="290" width="20" height="74" rx="10" /></Zone>
            <Zone label="Polpaccio sx"><rect x="106" y="290" width="20" height="74" rx="10" /></Zone>
            <Zone label="Tendine d'Achille dx"><rect x="79" y="366" width="12" height="26" rx="5" /></Zone>
            <Zone label="Tendine d'Achille sx"><rect x="109" y="366" width="12" height="26" rx="5" /></Zone>
          </>
        )}
      </svg>

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
