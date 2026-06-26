"use client";

import type { Athlete, SessionTemplate, TemplateDomain } from "@/lib/types";
import { useLocalCollection } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { AssignButton } from "@/components/programmazione/AssignButton";

/** Template creati dall'utente (dal costruttore di sessione) per questo dominio. */
export function CustomTemplates({ clientId, domain, athletes, defaultDate }: { clientId: string; domain: TemplateDomain; athletes: Athlete[]; defaultDate?: string }) {
  const { items, remove } = useLocalCollection<SessionTemplate>(`templates:${clientId}`);
  const list = items.filter((t) => t.domain === domain && t.custom);
  if (list.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-2"><Icon name="sparkle" size={15} className="brand-text" /> Creati da te</h3>
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((t) => {
          const pres = t.prescription ?? [];
          return (
            <div key={t.id} className="card overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">{t.name}</span>
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">creato</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">{pres.length} esercizi · {t.estimated.durationMin}′ · RPE ~{t.estimated.internalRpe}{t.circuits?.length ? ` · ${t.circuits.length} circuito/i` : ""}</div>
                </div>
                <button onClick={() => remove(t.id)} className="rounded p-1 text-muted hover:text-red-600" title="Elimina template">✕</button>
              </div>
              <div className="px-4 py-3">
                {t.goal && <p className="mb-2 text-[13px] text-muted">🎯 {t.goal}</p>}
                <ul className="space-y-1">
                  {pres.slice(0, 6).map((p, i) => (
                    <li key={`${p.exerciseId}-${i}`} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate"><span className="text-muted-2">{i + 1}.</span> {p.name}</span>
                      <span className="shrink-0 text-[12px] text-muted">{p.sets ? `${p.sets}×` : ""}{p.reps ?? ""}{p.intensity ? ` · ${p.intensity}` : ""}</span>
                    </li>
                  ))}
                  {pres.length > 6 && <li className="text-[12px] text-muted-2">+ altri {pres.length - 6}</li>}
                </ul>
                <div className="mt-3 flex justify-end">
                  <AssignButton clientId={clientId} athletes={athletes} variant="solid" defaultDate={defaultDate}
                    target={{ kind: "template", refId: t.id, refName: t.name, domain: t.domain, durationMin: t.estimated.durationMin, estRpe: t.estimated.internalRpe, items: pres.map((p) => ({ exerciseId: p.exerciseId, name: p.name, durationMin: p.durationMin })) }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
