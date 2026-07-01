import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getMatchAnalysis, LEAGUE_BENCH, type MatchStat } from "@/lib/matchAnalysis";
import { Icon } from "@/components/Icon";
import { PageHeader, Panel, StatCard } from "@/components/ui";

const fmtShort = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { day: "2-digit", month: "short", timeZone: "UTC" });

export default async function MatchAnalysisPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const { matches, season } = getMatchAnalysis(clientId);
  const a = season.avg;

  return (
    <div className="mx-auto max-w-[1400px] fade-up">
      <PageHeader title="Match Analysis" subtitle="Statistiche di squadra dalle partite — possesso, costruzione, finalizzazione, duelli aerei e palle inattive" icon="soccer" />

      {/* Riepilogo stagione */}
      <div className="mb-5 card brand-topline flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Bilancio · {season.played} gare</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{season.won}<span className="text-muted-2">-</span>{season.drawn}<span className="text-muted-2">-</span>{season.lost}</span>
            <span className="text-[12px] text-muted">V-N-P</span>
          </div>
        </div>
        <Divider />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Punti</div>
          <div className="mt-1 text-3xl font-extrabold brand-text">{season.points}</div>
        </div>
        <Divider />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Gol</div>
          <div className="mt-1 text-3xl font-extrabold">{season.gf}<span className="mx-1 text-lg font-bold text-muted-2">:</span>{season.ga}</div>
          <div className="text-[11px] text-muted-2">fatti · subiti</div>
        </div>
        <Divider />
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Forma (ultime 5)</div>
          <div className="flex gap-1.5">
            {season.form.map((r, i) => (
              <span key={i} className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold text-white" style={{ backgroundColor: r === "V" ? "var(--good)" : r === "N" ? "var(--muted-2)" : "var(--bad)" }}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI di squadra */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Possesso" value={`${a.possession}%`} hint={benchHint(a.possession, LEAGUE_BENCH.possession)} icon="soccer" tone="brand" />
        <StatCard label="Passaggi ok" value={`${a.passAccuracy}%`} hint={`${a.passes}/gara`} icon="link" />
        <StatCard label="Tiri / gara" value={a.shots} hint={`${a.shotsOnTarget} in porta`} icon="target" />
        <StatCard label="xG / gara" value={a.xg} hint={benchHint(a.xg, LEAGUE_BENCH.xg)} icon="trend" tone="brand" />
        <StatCard label="Duelli aerei" value={`${a.aerialWinPct}%`} hint="vinti" icon="bolt" tone={a.aerialWinPct >= 50 ? "good" : "warn"} />
        <StatCard label="PPDA" value={a.ppda} hint="pressing (↓ = intenso)" icon="pulse" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gioco aereo & duelli (colpi di testa) */}
        <Panel title={<><Icon name="bolt" size={15} className="brand-text" /> Gioco aereo &amp; duelli</>} className="brand-topline">
          <div className="space-y-3.5 p-5">
            <MetricRow label="Duelli aerei vinti" value={`${a.aerialWinPct}%`} pct={a.aerialWinPct} color="#7c3aed" bench={LEAGUE_BENCH.aerialWinPct} />
            <MetricRow label="Duelli a terra vinti" value={`${a.groundWinPct}%`} pct={a.groundWinPct} color="#7c3aed" bench={LEAGUE_BENCH.groundWinPct} />
            <MetricRow label="Duelli aerei vinti / gara" value={`${a.aerialWon}`} pct={pctOf(a.aerialWon, 30)} color="#a855f7" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat label="Gol di testa" value={season.total.headedGoals} icon="soccer" />
              <MiniStat label="Duelli aerei totali" value={season.total.aerialDuels} icon="bolt" />
            </div>
          </div>
        </Panel>

        {/* Costruzione & finalizzazione */}
        <Panel title={<><Icon name="target" size={15} className="brand-text" /> Costruzione &amp; finalizzazione</>} className="brand-topline">
          <div className="space-y-3.5 p-5">
            <MetricRow label="Possesso palla" value={`${a.possession}%`} pct={a.possession} color="var(--brand-primary)" bench={LEAGUE_BENCH.possession} />
            <MetricRow label="Precisione passaggi" value={`${a.passAccuracy}%`} pct={a.passAccuracy} color="var(--brand-primary)" bench={LEAGUE_BENCH.passAccuracy} />
            <MetricRow label="Precisione cross" value={`${a.crossAccuracy}%`} pct={a.crossAccuracy} color="#0891b2" bench={LEAGUE_BENCH.crossAccuracy} />
            <MetricRow label="Tiri in porta" value={`${a.shotAccuracy}%`} pct={a.shotAccuracy} color="#ea580c" />
            <div className="grid grid-cols-3 gap-3 pt-1">
              <MiniStat label="Tiri / gara" value={a.shots} icon="target" />
              <MiniStat label="xG / gara" value={a.xg} icon="trend" />
              <MiniStat label="Grandi occ." value={a.bigChances} icon="bolt" />
            </div>
          </div>
        </Panel>

        {/* Fase difensiva & pressing */}
        <Panel title={<><Icon name="medical" size={15} className="brand-text" /> Fase difensiva &amp; pressing</>} className="brand-topline">
          <div className="space-y-3.5 p-5">
            <MetricRow label="Contrasti / gara" value={`${a.tackles}`} pct={pctOf(a.tackles, 26)} color="#0891b2" />
            <MetricRow label="Intercetti / gara" value={`${a.interceptions}`} pct={pctOf(a.interceptions, 18)} color="#0891b2" />
            <MetricRow label="Respinte / gara" value={`${a.clearances}`} pct={pctOf(a.clearances, 32)} color="#0891b2" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat label="PPDA" value={a.ppda} icon="pulse" hint="pressing" />
              <MiniStat label="xGA / gara" value={a.xga} icon="medical" hint="concesso" />
            </div>
          </div>
        </Panel>

        {/* Palle inattive */}
        <Panel title={<><Icon name="pitch" size={15} className="brand-text" /> Palle inattive &amp; disciplina</>} className="brand-topline">
          <div className="space-y-3.5 p-5">
            <MetricRow label="Calci d'angolo / gara" value={`${a.corners}`} pct={pctOf(a.corners, 10)} color="#d97706" bench={pctOf(LEAGUE_BENCH.corners, 10)} benchValue={LEAGUE_BENCH.corners} />
            <MetricRow label="Angoli concessi / gara" value={`${a.cornersAgainst}`} pct={pctOf(a.cornersAgainst, 10)} color="#94a3b8" />
            <div className="grid grid-cols-3 gap-3 pt-1">
              <MiniStat label="Gol da p. inattiva" value={season.total.setPieceGoals} icon="soccer" />
              <MiniStat label="Falli / gara" value={a.fouls} icon="bell" />
              <MiniStat label="Fuorigioco / gara" value={a.offsides} icon="target" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Dettaglio partite */}
      <Panel title={<><Icon name="calendar" size={15} className="brand-text" /> Dettaglio partite</>} className="brand-topline mt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-3 py-3 font-semibold">Avversario</th>
                <th className="px-3 py-3 font-semibold">Ris.</th>
                <th className="px-3 py-3 font-semibold">Poss.</th>
                <th className="px-3 py-3 font-semibold">Tiri (in porta)</th>
                <th className="px-3 py-3 font-semibold">xG</th>
                <th className="px-3 py-3 font-semibold">Duelli aerei</th>
                <th className="px-3 py-3 font-semibold">Angoli</th>
                <th className="px-3 py-3 font-semibold">Falli</th>
              </tr>
            </thead>
            <tbody>
              {[...matches].reverse().map((m) => <MatchRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-4 text-[12px] text-muted-2">Dati di esempio a scopo dimostrativo. In produzione la sezione si alimenta da un provider di match data (event data / tracking) con la stessa struttura.</p>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-10 w-px bg-border sm:block" />;
}

function benchHint(v: number, bench: number): string {
  const d = Number((v - bench).toFixed(2));
  return `${d >= 0 ? "+" : ""}${d} vs media lega`;
}

function pctOf(v: number, max: number): number {
  return Math.max(0, Math.min(100, (v / max) * 100));
}

function MetricRow({ label, value, pct, color, bench, benchValue }: { label: string; value: string; pct: number; color: string; bench?: number; benchValue?: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground/85">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        {bench != null && (
          <div className="absolute inset-y-0 w-0.5 bg-foreground/40" style={{ left: `${bench}%` }} title={`Media lega${benchValue != null ? ` ${benchValue}` : ` ${bench}%`}`} />
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, hint }: { label: string; value: number | string; icon: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-2"><Icon name={icon} size={12} /> {label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      {hint && <div className="text-[10.5px] text-muted-2">{hint}</div>}
    </div>
  );
}

function MatchRow({ m }: { m: MatchStat }) {
  const res = m.gf > m.ga ? "V" : m.gf === m.ga ? "N" : "P";
  const resColor = res === "V" ? "var(--good)" : res === "N" ? "var(--muted-2)" : "var(--bad)";
  const aerialPct = Math.round((m.aerialWon / Math.max(1, m.aerialDuels)) * 100);
  return (
    <tr className="border-b border-border last:border-0 hover:bg-background">
      <td className="px-4 py-2.5 font-mono text-muted">{fmtShort(m.date)}</td>
      <td className="px-3 py-2.5">
        <span className="font-semibold">{m.opponent}</span>
        <span className="ml-1.5 rounded px-1 py-0.5 text-[10px] font-medium text-muted-2 ring-1 ring-border">{m.venue === "casa" ? "C" : "T"}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono font-bold">
          <span className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-white" style={{ backgroundColor: resColor }}>{res}</span>
          {m.gf}-{m.ga}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono">{m.possession}%</td>
      <td className="px-3 py-2.5 font-mono">{m.shots} <span className="text-muted-2">({m.shotsOnTarget})</span></td>
      <td className="px-3 py-2.5 font-mono font-semibold">{m.xg.toFixed(2)}</td>
      <td className="px-3 py-2.5 font-mono">{m.aerialWon}/{m.aerialDuels} <span className="text-muted-2">({aerialPct}%)</span></td>
      <td className="px-3 py-2.5 font-mono">{m.corners}</td>
      <td className="px-3 py-2.5 font-mono">{m.fouls}</td>
    </tr>
  );
}
