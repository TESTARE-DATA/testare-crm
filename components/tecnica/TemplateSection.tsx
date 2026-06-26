import Link from "next/link";
import { getAthletes, getExercises, getTemplates } from "@/lib/data";
import { sectionHref } from "@/lib/nav";
import type { SessionTemplate, TemplateDomain } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Badge, PageHeader } from "@/components/ui";
import { AssignButton } from "@/components/programmazione/AssignButton";
import { CustomTemplates } from "@/components/tecnica/CustomTemplates";

/** Lista template filtrata per dominio (campo = Area Tecnica · palestra = Prep. Atletica). */
export function TemplateSection({ clientId, domain, defaultDate }: { clientId: string; domain: TemplateDomain; defaultDate?: string }) {
  const templates = getTemplates(clientId).filter((t) => t.domain === domain);
  const exercises = getExercises(clientId);
  const athletes = getAthletes(clientId);
  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;
  const isCampo = domain === "campo";

  return (
    <div className="mx-auto max-w-7xl fade-up">
      <PageHeader
        title="Template"
        subtitle={isCampo ? "Sedute di campo con carico interno (RPE) ed esterno (km, sprint) — stimato vs effettivo" : "Sedute di palestra per gruppi muscolari — carico interno stimato vs effettivo"}
        icon="layers"
        actions={<button className="brand-bg brand-on rounded-xl px-4 py-2 text-sm font-semibold shadow-sm">+ Template</button>}
      />

      {templates.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">Nessun template in questa sezione.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="card card-hover overflow-hidden">
              <TemplateHeader template={t} isCampo={isCampo} />
              <div className="px-4 py-3">
                <p className="text-[13px] text-muted">{t.goal}</p>

                {t.muscleGroups && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.muscleGroups.map((m) => <span key={m} className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/70">{m}</span>)}
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {t.exerciseIds.map((id, i) => (
                    <div key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-1.5">
                      <span className="brand-soft-bg brand-text flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold">{i + 1}</span>
                      <span className="text-[13px]">{exName(id)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                    <span>Carico</span>
                    <span className="flex gap-3">
                      <span className="flex items-center gap-1"><Dot c="var(--brand-primary)" /> stimato</span>
                      <span className="flex items-center gap-1"><Dot c="#94a3b8" /> effettivo</span>
                    </span>
                  </div>
                  <LoadRow label="Durata" unit="′" est={t.estimated.durationMin} act={t.actual?.durationMin} max={100} />
                  <LoadRow label="RPE interno" unit="" est={t.estimated.internalRpe} act={t.actual?.internalRpe} max={10} />
                  {isCampo && (
                    <>
                      <LoadRow label="Distanza" unit=" km" est={t.estimated.externalKm} act={t.actual?.externalKm} max={10} dec />
                      <LoadRow label="Sprint" unit="" est={t.estimated.sprints} act={t.actual?.sprints} max={40} />
                      <LoadRow label="Alta intensità" unit=" m" est={t.estimated.highIntensityM} act={t.actual?.highIntensityM} max={1000} />
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted"><Icon name="stopwatch" size={15} /> {t.estimated.durationMin}′</span>
                  <div className="flex items-center gap-2">
                    <Link href={sectionHref(clientId, "calendario")} className="brand-text text-[13px] font-semibold hover:underline">Calendario →</Link>
                    <AssignButton clientId={clientId} athletes={athletes} variant="solid" defaultDate={defaultDate} target={{ kind: "template", refId: t.id, refName: t.name, domain: t.domain, durationMin: t.estimated.durationMin, estRpe: t.estimated.internalRpe, items: t.exerciseIds.map((id) => ({ exerciseId: id, name: exName(id), durationMin: exercises.find((e) => e.id === id)?.durationMin })) }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomTemplates clientId={clientId} domain={domain} athletes={athletes} defaultDate={defaultDate} />
    </div>
  );
}

function TemplateHeader({ template, isCampo }: { template: SessionTemplate; isCampo: boolean }) {
  const t = template;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="brand-soft-bg brand-text flex h-9 w-9 items-center justify-center rounded-lg"><Icon name={isCampo ? "pitch" : "dumbbell"} size={18} /></span>
        <h3 className="text-base font-bold">{t.name}</h3>
      </div>
      {t.microcycleDay ? <Badge tone="brand">{t.microcycleDay}</Badge> : <Badge tone="default">{t.domain}</Badge>}
    </div>
  );
}

function LoadRow({ label, unit, est, act, max, dec }: { label: string; unit: string; est: number; act?: number; max: number; dec?: boolean }) {
  const fmt = (n: number) => (dec ? n.toFixed(1) : n);
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono">{fmt(est)}{unit}{act != null && <span className="text-muted"> · {fmt(act)}{unit}</span>}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-background">
        <div className="brand-bg absolute left-0 top-0 h-full rounded-full opacity-90" style={{ width: `${Math.min(100, (est / max) * 100)}%` }} />
        {act != null && <div className="absolute left-0 top-0 h-full rounded-full bg-slate-400/70" style={{ width: `${Math.min(100, (act / max) * 100)}%` }} />}
      </div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c }} />;
}
