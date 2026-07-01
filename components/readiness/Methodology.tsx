import { RE_CONFIG, RE_QUESTIONNAIRE } from "@/lib/readinessEngine-core";
import { Icon } from "@/components/Icon";

// ============================================================================
// Metodologia EBM del Daily Readiness Engine — documentazione IN PIATTAFORMA
// (Spec v1.0). Rende esplicite le regole di costruzione del dato per lo staff.
// Statico: legge le costanti da RE_CONFIG così i valori mostrati = quelli usati.
// ============================================================================

export function Methodology() {
  const w = RE_CONFIG.weights;
  return (
    <div className="card brand-topline mt-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Icon name="sparkle" size={16} className="brand-text" />
        <h2 className="text-sm font-bold">Metodologia — Daily Readiness Engine (evidence-based)</h2>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-2">Spec v1.0</span>
      </div>

      <div className="space-y-3 p-5">
        <p className="text-[13px] text-muted">
          Due flussi <b>separati</b>, mai fusi in un unico numero: la <b>prontezza</b> (questionario mattutino soggettivo) è la
          <i> risposta</i>; il <b>carico</b> (sRPE) è l&apos;<i>input</i>. Si calcolano separatamente e si incrociano solo nella matrice di alert.
          Riferimento sempre <b>individuale</b> (l&apos;atleta rispetto a sé stesso), mai medie di squadra.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <Rule icon="pulse" title="Track Readiness → z-score" tone="#7c3aed">
            Questionario 1–7 (1=pessimo…7=ottimo) su fatica, DOMS, sonno (qualità e ore), stress, umore. Ogni item
            confrontato con la <b>baseline individuale</b> (media/DS su {RE_CONFIG.baseline_window_days} giorni, min {RE_CONFIG.min_baseline_days}):
            <code className="mx-1 rounded bg-background px-1 py-0.5 text-[11px]">z = (valore − media) / DS</code>.
            Sotto i {RE_CONFIG.min_baseline_days} giorni → <b>baseline in costruzione</b> (soglie assolute provvisorie).
          </Rule>

          <Rule icon="chart" title="Punteggio composito (pesato)" tone="#0891b2">
            Media pesata degli z-score, peso maggiore agli item più sensibili al carico:
            <span className="mt-1 flex flex-wrap gap-1.5">
              {RE_QUESTIONNAIRE.filter((q) => q.key in w).map((q) => (
                <span key={q.key} className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium" style={{ color: q.color }}>{q.short} {w[q.key as keyof typeof w]}</span>
              ))}
            </span>
            <span className="mt-1 block">Display 0–100 (solo UI): <code className="rounded bg-background px-1 py-0.5 text-[11px]">50 + {RE_CONFIG.display_scale}·z</code>. Se manca l&apos;umore, il peso si ridistribuisce.</span>
          </Rule>

          <Rule icon="load" title="Track Load → EWMA (no ACWR)" tone="#16a34a">
            <b>sRPE = RPE × durata</b> (A.U.); più sedute si sommano nel giorno. Si mostrano <b>carico settimanale</b>,
            <b> variazione settimana-su-settimana</b> ed <b>EWMA</b> acuto ({RE_CONFIG.ewma_acute_N} gg) e cronico ({RE_CONFIG.ewma_chronic_N} gg)
            come linee di trend. <b>Niente ACWR</b> (privo di validità predittiva, accoppiamento matematico). Picco se WoW &gt; {RE_CONFIG.load_spike_pct}%.
          </Rule>

          <Rule icon="bell" title="Flag & matrice di alert" tone="#dc2626">
            Flag da z composito: 🔴 z ≤ {RE_CONFIG.z_red} · 🟡 ≤ {RE_CONFIG.z_amber} · 🟢 sopra. La <b>matrice readiness × carico</b> distingue
            fatica da allenamento vs stressor extra-campo. <b>Red flag localizzato</b>: DOMS ≤ {RE_CONFIG.doms_red} con zona → notifica staff medico,
            bypassando la media. Override se un item chiave crolla (z ≤ {RE_CONFIG.z_item_red}).
          </Rule>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background/60 p-3.5 text-[12px] text-foreground/75">
          <b>Onestà del modello:</b> questi indicatori sono sensibili al <i>carico</i>, non predittori validati di <i>infortunio</i>.
          Gli alert sono di supporto decisionale: la piattaforma segnala, lo staff decide (nessuna modifica automatica dei piani).
          Tutte le costanti sono tarabili da pannello admin e versionate (audit).
        </div>

        <details className="group rounded-xl border border-border">
          <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[12px] font-semibold text-muted transition-colors hover:text-foreground">
            <Icon name="chevron" size={13} className="mr-1 inline transition-transform group-open:rotate-90" /> Base scientifica
          </summary>
          <p className="border-t border-border px-3.5 py-2.5 text-[11.5px] leading-relaxed text-muted-2">
            Impellizzeri, Marcora &amp; Coutts 2019 (load vs response) e Impellizzeri 2020 (abbandono ACWR); Saw, Main &amp; Gastin 2016 e
            serie Thorpe 2015–2017 (sensibilità del soggettivo nel calcio); Hooper &amp; Mackinnon 1995 (item core); Foster 2001 e
            Impellizzeri 2004 (sRPE); Buchheit 2014 e Plews 2013 (baseline, medie mobili, SWC); Coyne 2018 (anti-gaming, compliance).
          </p>
        </details>
      </div>
    </div>
  );
}

function Rule({ icon, title, tone, children }: { icon: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1a`, color: tone }}><Icon name={icon} size={15} /></span>
        <h3 className="text-[13px] font-bold">{title}</h3>
      </div>
      <div className="text-[12px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}
