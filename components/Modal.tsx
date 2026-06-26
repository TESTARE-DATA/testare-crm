"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal montato in PORTAL su document.body: così sfugge a qualsiasi antenato
 * con `transform`/`filter`/`backdrop-filter` (es. la classe .fade-up animata),
 * che altrimenti renderebbe il `position: fixed` relativo a quell'antenato
 * invece che al viewport. Backdrop sfocato pulito, card centrata e contenuta.
 */
export function Modal({
  onClose,
  children,
  size = "lg",
}: {
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // blocca lo scroll dello sfondo
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" }[size];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-md" onClick={onClose} />
      <div
        className={`card relative z-[101] flex max-h-[90vh] w-full ${w} flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 24px 64px rgba(15,23,42,.28), 0 8px 24px rgba(15,23,42,.16)" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Header standard di un modal (non scrolla). */
export function ModalHeader({ title, subtitle, onClose, accent }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; accent?: string }) {
  const onAccent = !!accent;
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 px-6 py-4" style={accent ? { backgroundColor: accent, color: "#fff" } : { borderBottom: "1px solid var(--border)" }}>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <div className={`text-[12px] ${onAccent ? "opacity-90" : "text-muted"}`}>{subtitle}</div>}
      </div>
      <button onClick={onClose} className={`rounded-lg p-1.5 ${onAccent ? "text-white/80 hover:bg-white/15" : "text-muted hover:bg-background"}`}>✕</button>
    </div>
  );
}
