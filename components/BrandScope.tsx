import type { CSSProperties, ReactNode } from "react";
import type { BrandPalette } from "@/lib/types";

/**
 * Avvolge una porzione di UI e imposta le variabili CSS --brand-* sui colori
 * del cliente. Tutti i componenti figli che usano le classi brand-* o le
 * variabili si rebrandizzano automaticamente.
 */
export function BrandScope({
  colors,
  children,
  className,
}: {
  colors: BrandPalette;
  children: ReactNode;
  className?: string;
}) {
  const style = {
    "--brand-primary": colors.primary,
    "--brand-primary-dark": colors.primaryDark,
    "--brand-accent": colors.accent,
    "--brand-on-primary": colors.onPrimary,
    "--brand-soft": colors.soft,
  } as CSSProperties;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
