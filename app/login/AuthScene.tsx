"use client";

import { useEffect, useRef } from "react";

// Sfondo animato del login: "stadio di notte" — pitch in prospettiva che
// respira, riflettori che spazzano, punto live che pulsa, parallasse col mouse.
// Tutto SVG/CSS, zero dipendenze. Rispetta prefers-reduced-motion (via CSS).
export function AuthScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={ref} className="auth-scene absolute inset-0 overflow-hidden" aria-hidden>
      {/* Campo in prospettiva */}
      <svg className="auth-pitch absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>
        <g stroke="url(#lineFade)" strokeWidth="1.5" fill="none">
          {/* Linee orizzontali */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`h${i}`} x1="-200" x2="1200" y1={i * 100} y2={i * 100} />
          ))}
          {/* Linee verticali */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 100} x2={i * 100} y1="-200" y2="1200" />
          ))}
          {/* Cerchio di centrocampo */}
          <circle cx="500" cy="500" r="120" />
          <line x1="-200" x2="1200" y1="500" y2="500" strokeWidth="2" />
          {/* Aree */}
          <rect x="330" y="-40" width="340" height="150" />
          <rect x="330" y="890" width="340" height="150" />
        </g>
        {/* Punto "live" al centrocampo */}
        <circle className="auth-spot" cx="500" cy="500" r="5" fill="#e94f35" />
      </svg>

      {/* Fasci dei riflettori */}
      <div className="auth-sweep-a absolute -top-1/2 left-1/4 h-[200%] w-[38%] bg-gradient-to-b from-white/8 via-white/3 to-transparent blur-2xl" />
      <div className="auth-sweep-b absolute -top-1/2 right-1/4 h-[200%] w-[30%] bg-gradient-to-b from-[#e94f35]/10 via-[#e94f35]/3 to-transparent blur-2xl" />

      {/* Vignettatura + grana pellicola */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
      <div className="auth-grain absolute inset-0" />
    </div>
  );
}
