import Link from "next/link";
import type { ReactNode } from "react";
import { TIER_META } from "@/lib/perf";
import type { PerfTier } from "@/lib/types";
import { Icon } from "./Icon";

// ---- Intestazione pagina ----------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="brand-soft-bg brand-text flex h-11 w-11 items-center justify-center rounded-xl">
            <Icon name={icon} size={22} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- KPI card ---------------------------------------------------------------
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
  tone?: "default" | "brand" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-600"
      : tone === "good"
        ? "text-emerald-600"
        : tone === "brand"
          ? "brand-text"
          : "text-foreground";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</span>
        {icon && <Icon name={icon} size={16} className="text-muted" />}
      </div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

// ---- Badge ------------------------------------------------------------------
const BADGE_TONES: Record<string, string> = {
  default: "bg-background text-foreground/70 border-border",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  brand: "brand-soft-bg brand-text border-transparent",
};

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

// ---- Card riquadro ----------------------------------------------------------
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ---- Link "vai a" (collega le sezioni tra loro) -----------------------------
/** Link "torna indietro" per le sotto-sezioni (es. da un'area di Test e misura all'hub). */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-foreground">
      <Icon name="arrowLeft" size={15} /> {children}
    </Link>
  );
}

export function CrossLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="brand-text inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline"
    >
      <Icon name="link" size={14} /> {children}
    </Link>
  );
}

// Modal e ModalHeader vivono in components/Modal.tsx (client, montati in portal).

// ---- Banner "in definizione" ------------------------------------------------
export function ScopeNote({ children }: { children: ReactNode }) {
  return (
    <div className="brand-soft-bg mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-foreground/70">
      <span className="brand-text font-semibold">Prossimo step · </span>
      {children}
    </div>
  );
}

// ---- Tier badge (Elite / Buono / Attenzione / Critico) ----------------------
export function TierBadge({ tier, showRange }: { tier: PerfTier; showRange?: boolean }) {
  const m = TIER_META[tier];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: m.color, backgroundColor: m.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {tier}{showRange && <span className="opacity-60">· {m.range}</span>}
    </span>
  );
}

// ---- Delta pill (Δ vs sessione precedente, con soglia SWC) -------------------
export function DeltaPill({ value, significant, size = "sm" }: { value: number; significant: boolean; size?: "sm" | "lg" }) {
  const up = value > 0;
  const flat = value === 0;
  const color = flat ? "var(--muted)" : up ? "var(--good)" : "var(--bad)";
  const bg = flat ? "var(--background)" : up ? "rgba(22,163,74,.10)" : "rgba(220,38,38,.10)";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-bold ${size === "lg" ? "px-2.5 py-1 text-[13px]" : "px-1.5 py-0.5 text-[11px]"}`}
      style={{ color, backgroundColor: bg, opacity: significant || flat ? 1 : 0.6 }}
      title={significant ? "Oltre la soglia SWC (Hopkins 2006)" : "Entro SWC · rumore test-retest"}
    >
      {flat ? "—" : `${up ? "▲" : "▼"} ${up ? "+" : ""}${value}`}
    </span>
  );
}
