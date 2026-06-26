import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/** Intestazione clinica condivisa dell'Area Medica: badge a croce, kicker
 *  mono, linea ECG e azioni contestuali (specifiche per ogni area). */
export function MedHeader({
  section,
  title,
  subtitle,
  icon = "medical",
  actions,
}: {
  /** Accettati per compatibilità con le pagine, non più usati qui. */
  clientId?: string;
  seedCount?: number;
  section: string;
  title: string;
  subtitle: string;
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="med-topline med-grid card relative mb-6 overflow-hidden">
      {/* ECG decorativa */}
      <svg className="pointer-events-none absolute right-0 top-0 hidden h-full w-[280px] opacity-[0.18] md:block" viewBox="0 0 280 120" preserveAspectRatio="none" aria-hidden>
        <path className="ecg-line" d="M0 60 H70 l8 -34 l10 64 l9 -52 l8 22 H150 l8 -30 l10 56 l9 -26 H280" fill="none" stroke="var(--med)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      <div className="relative flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="med-soft-bg med-accent flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-[color-mix(in_srgb,var(--med)_25%,transparent)]">
            <Icon name={icon} size={26} />
          </span>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] med-accent">
              <span className="dot-live inline-flex h-1.5 w-1.5 rounded-full med-accent-bg" /> Area Medica · {section}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
