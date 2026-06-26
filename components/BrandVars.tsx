"use client";

import { useEffect } from "react";
import type { BrandPalette } from "@/lib/types";

/**
 * Imposta le variabili --brand-* su <html> mentre si è dentro un cliente, così
 * anche i contenuti montati in PORTAL fuori dal BrandScope (i Modal) ereditano
 * i colori della società. Ripristina i default all'uscita.
 */
export function BrandVars({ colors }: { colors: BrandPalette }) {
  useEffect(() => {
    const root = document.documentElement;
    const set = (k: string, v: string) => root.style.setProperty(k, v);
    set("--brand-primary", colors.primary);
    set("--brand-primary-dark", colors.primaryDark);
    set("--brand-accent", colors.accent);
    set("--brand-on-primary", colors.onPrimary);
    set("--brand-soft", colors.soft);
    return () => {
      ["--brand-primary", "--brand-primary-dark", "--brand-accent", "--brand-on-primary", "--brand-soft"].forEach((k) => root.style.removeProperty(k));
    };
  }, [colors]);
  return null;
}
