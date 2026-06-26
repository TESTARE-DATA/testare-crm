"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Athlete } from "@/lib/types";
import { sectionHref } from "@/lib/nav";
import { useAthleteEdits } from "@/lib/useAthleteEdits";
import { readinessTier } from "@/lib/readiness-core";
import { AthletePhoto } from "@/components/rosa/AthletePhoto";
import { AthleteFormModal, type AthleteFormValues } from "@/components/rosa/AthleteFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { Badge, DeltaPill } from "@/components/ui";

/** Intestazione scheda atleta: applica gli override locali e permette modifica/rimozione. */
export function AthleteHeader({
  clientId,
  athlete,
  rdScore,
  rdPrev,
}: {
  clientId: string;
  athlete: Athlete;
  rdScore: number | null;
  rdPrev: number | null;
}) {
  const router = useRouter();
  const { apply, setOverride, hide } = useAthleteEdits(clientId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const a = apply(athlete); // applica eventuali correzioni locali
  const rdTier = rdScore != null ? readinessTier(rdScore) : null;

  function save(v: AthleteFormValues) {
    setOverride(a.id, {
      firstName: v.firstName, lastName: v.lastName, role: v.role, shirtNumber: v.shirtNumber,
      birthDate: v.birthDate, nationality: v.nationality, foot: v.foot, status: v.status,
      heightCm: v.heightCm, weightKg: v.weightKg,
    });
  }

  function remove() {
    hide(a.id);
    router.push(sectionHref(clientId, "rosa"));
  }

  return (
    <div className="card relative mb-6 overflow-hidden p-6">
      <div className="grad-line absolute inset-x-0 top-0" />

      {/* Azioni */}
      <div className="absolute right-4 top-4 z-10 flex gap-1.5">
        <button onClick={() => setEditing(true)} title="Modifica anagrafica" className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-foreground">
          <Icon name="clipboard" size={14} /> Modifica
        </button>
        <button onClick={() => setConfirming(true)} title="Rimuovi atleta" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-red-300 hover:text-bad">
          <span className="text-[14px] leading-none">✕</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <AthletePhoto clientId={clientId} athleteId={a.id} firstName={a.firstName} lastName={a.lastName} seedPhotoUrl={a.photoUrl} shirtNumber={a.shirtNumber} size={128} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{a.firstName} {a.lastName}</h1>
            {rdTier && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ color: rdTier.color, backgroundColor: rdTier.bg }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rdTier.color }} /> Readiness {rdTier.level}
              </span>
            )}
            <StatusBadge status={a.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="font-medium text-foreground/80">{a.role}</span>
            <span>{a.nationality}</span>
            <span title="Data di nascita">🎂 {fmtBirth(a.birthDate)} · {age(a.birthDate)} anni</span>
            <span>Piede {a.foot.toLowerCase()}</span>
            <span>#{a.shirtNumber}</span>
          </div>
        </div>
        {rdScore != null && rdTier && (
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Readiness</div>
            <div className="text-5xl font-extrabold leading-none" style={{ color: rdTier.color }}>{rdScore}<span className="text-2xl">%</span></div>
            {rdPrev != null && (
              <div className="mt-1 flex items-center justify-center gap-1">
                <DeltaPill value={rdScore - rdPrev} significant={Math.abs(rdScore - rdPrev) >= 5} />
                <span className="text-[10px] text-muted-2">vs ieri</span>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && <AthleteFormModal initial={a} onClose={() => setEditing(false)} onSave={save} />}
      {confirming && (
        <ConfirmDialog
          title="Rimuovere atleta"
          danger
          confirmLabel="Rimuovi"
          message={<>Vuoi rimuovere <b>{a.firstName} {a.lastName}</b> dalla rosa? L&apos;atleta sparirà dalle statistiche di squadra.</>}
          onConfirm={remove}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "disponibile" ? "green" : status === "infortunato" ? "red" : status === "in valutazione" ? "blue" : status === "in recupero" ? "amber" : "default";
  return <Badge tone={tone as "green" | "red" | "amber" | "blue" | "default"}>{status}</Badge>;
}
function age(b: string) {
  return Math.floor((Date.parse("2026-06-22") - Date.parse(b)) / (365.25 * 86400000));
}
function fmtBirth(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}
