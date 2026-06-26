"use client";

import type { Athlete } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/overview/CountUp";

/**
 * Antropometria dell'atleta in veste premium: misure principali, gauge BMI,
 * composizione corporea (massa magra/grassa) e indici derivati.
 */
export function AthleteAnthropometrics({ athlete }: { athlete: Athlete }) {
  const a = athlete;
  const bmi = a.weightKg / (a.heightCm / 100) ** 2;
  const fatKg = (a.weightKg * a.bodyFatPct) / 100;
  const leanKg = a.weightKg - fatKg;
  const leanPct = 100 - a.bodyFatPct;
  const apeIndex = a.wingspanCm - a.heightCm; // cm (positivo = braccia più lunghe dell'altezza)

  const bmiCat = bmiCategory(bmi);

  return (
    <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Misure principali */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
        <BigMetric icon="users" label="Altezza" value={a.heightCm} unit="cm" />
        <BigMetric icon="load" label="Peso" value={a.weightKg} unit="kg" decimals={0} />
        <BigMetric icon="layers" label="Apertura braccia" value={a.wingspanCm} unit="cm" sub={`Ape index ${apeIndex >= 0 ? "+" : ""}${apeIndex} cm`} />
        <BigMetric icon="chart" label="Massa grassa" value={a.bodyFatPct} unit="%" decimals={1} sub={`${fatKg.toFixed(1)} kg`} />
      </div>

      {/* BMI + composizione corporea */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4">
        {/* Gauge BMI */}
        <div className="flex items-center gap-4">
          <BmiGauge bmi={bmi} color={bmiCat.color} />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Indice di massa corporea</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight"><CountUp value={Number(bmi.toFixed(1))} decimals={1} /></span>
              <span className="text-[12px] text-muted">kg/m²</span>
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color: bmiCat.color, backgroundColor: `color-mix(in srgb, ${bmiCat.color} 12%, transparent)` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bmiCat.color }} /> {bmiCat.label}
            </span>
          </div>
        </div>

        {/* Composizione corporea */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-2">
            <span>Composizione corporea</span>
            <span className="text-muted">{a.weightKg} kg</span>
          </div>
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="grow-right" style={{ width: `${leanPct}%`, backgroundColor: "var(--brand-primary)", transformOrigin: "left" }} title={`Massa magra ${leanKg.toFixed(1)} kg`} />
            <div className="grow-right" style={{ width: `${a.bodyFatPct}%`, backgroundColor: "var(--warn)" }} title={`Massa grassa ${fatKg.toFixed(1)} kg`} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm brand-bg" /><b className="tnum">{leanKg.toFixed(1)} kg</b> <span className="text-muted">magra · {leanPct.toFixed(1)}%</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--warn)" }} /><b className="tnum">{fatKg.toFixed(1)} kg</b> <span className="text-muted">grassa</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigMetric({ icon, label, value, unit, sub, decimals = 0 }: { icon: string; label: string; value: number; unit: string; sub?: string; decimals?: number }) {
  return (
    <div className="lift rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg"><Icon name={icon} size={16} /></span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tracking-tight"><CountUp value={value} decimals={decimals} /></span>
        <span className="text-[13px] font-medium text-muted-2">{unit}</span>
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

/** Gauge semicircolare del BMI (15–35) con zone di riferimento. */
function BmiGauge({ bmi, color }: { bmi: number; color: string }) {
  const lo = 15, hi = 35;
  const t = Math.max(0, Math.min(1, (bmi - lo) / (hi - lo)));
  const R = 34, cx = 40, cy = 40, sw = 8;
  const a0 = Math.PI, a1 = 0; // semicerchio da sinistra (π) a destra (0)
  const ang = a0 + (a1 - a0) * t;
  const pt = ( a: number) => [cx + Math.cos(a) * R, cy - Math.sin(a) * R] as const;
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(ang);
  const [fx, fy] = pt(a1);
  const large = 0; // semicerchio: mezzo arco
  return (
    <svg width={80} height={50} viewBox="0 0 80 50" className="shrink-0">
      {/* zone di sfondo */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${fx} ${fy}`} fill="none" stroke="var(--border)" strokeWidth={sw} strokeLinecap="round" />
      {/* arco valore */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* lancetta */}
      <circle cx={ex} cy={ey} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Sottopeso", color: "var(--warn)" };
  if (bmi < 25) return { label: "Normopeso", color: "var(--good)" };
  if (bmi < 27) return { label: "Atletico", color: "var(--elite)" };
  if (bmi < 30) return { label: "Sovrappeso", color: "var(--warn)" };
  return { label: "Obesità", color: "var(--bad)" };
}
