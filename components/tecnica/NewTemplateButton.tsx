"use client";

import { useState } from "react";
import type { Athlete, SessionType } from "@/lib/types";
import { AssignModal, type AssignOptions } from "@/components/programmazione/AssignButton";

/**
 * CTA "+ Template": apre il costruttore di sessione (AssignModal in builder-mode)
 * già impostato sul dominio corretto. Il pulsante "Salva come template" del modal
 * crea un SessionTemplate { custom:true } che compare subito in "Creati da te".
 */
export function NewTemplateButton({
  clientId,
  athletes,
  options,
  defaultSessionType,
  defaultDate,
}: {
  clientId: string;
  athletes: Athlete[];
  options: AssignOptions;
  defaultSessionType: SessionType;
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="brand-bg brand-on rounded-xl px-4 py-2 text-sm font-semibold shadow-sm">+ Template</button>
      {open && (
        <AssignModal
          clientId={clientId}
          athletes={athletes}
          options={options}
          defaultSessionType={defaultSessionType}
          defaultDate={defaultDate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
