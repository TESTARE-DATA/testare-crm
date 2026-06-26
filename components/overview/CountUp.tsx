"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Numero che si anima da 0 al valore (easeOutCubic) al montaggio e ri-anima dal
 * valore corrente quando `value` cambia (es. modifiche alla rosa). Rispetta
 * prefers-reduced-motion e cifre tabulari.
 *
 * Robustezza: un timer garantisce SEMPRE il valore finale corretto anche se il
 * rAF viene throttlato (tab in background / rendering headless).
 */
export function CountUp({
  value,
  duration = 950,
  decimals = 0,
  className = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let raf = 0;
    const settle = () => { if (!alive) return; fromRef.current = value; setDisplay(value); };

    if (reduce) { settle(); return; }

    const from = fromRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      if (!alive) return;
      const t = Math.min(1, (now - t0) / duration);
      const cur = from + (value - from) * (1 - Math.pow(1 - t, 3));
      fromRef.current = cur;
      setDisplay(cur);
      if (t < 1) raf = requestAnimationFrame(step);
      else settle();
    };
    raf = requestAnimationFrame(step);
    // Garanzia di correttezza a prescindere dal rAF.
    const safety = window.setTimeout(settle, duration + 150);

    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [value, duration]);

  return <span className={`tnum ${className}`}>{display.toFixed(decimals)}</span>;
}
