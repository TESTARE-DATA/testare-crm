import Image from "next/image";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getCampionato, type MatchRow, type StandingRow } from "@/lib/campionato";
import { Icon } from "@/components/Icon";
import { Panel } from "@/components/ui";

export default async function CampionatoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const data = await getCampionato(clientId);

  return (
    <div className="mx-auto max-w-7xl fade-up">
      {/* Hero */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-6 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}
      >
        <Image src={client.logo} alt="" aria-hidden width={220} height={220} className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 object-contain opacity-[0.10]" />
        <div className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
          {data.state === "ok" ? <><span className="dot-live inline-flex h-1.5 w-1.5 rounded-full bg-white" /> Dati live · aggiornamento ogni 5 min</> : <>Campionato</>}
        </div>
        <h1 className="relative mt-1 text-2xl font-extrabold tracking-tight">
          {data.state === "ok" ? data.competitionName : "Campionato"} {data.state === "ok" && data.season ? `· ${data.season}` : ""}
        </h1>
        <p className="relative mt-1 text-[13px] opacity-85">Classifica, risultati e prossime partite di {client.name}</p>
      </div>

      {data.state === "no-key" && <SetupCard />}
      {data.state === "unsupported" && (
        <div className="card p-8 text-center text-sm text-muted">Campionato non configurato per questo cliente.</div>
      )}
      {data.state === "restricted" && <RestrictedCard competition={data.competitionName} />}
      {data.state === "error" && (
        <div className="card p-8 text-center text-sm text-muted">
          <Icon name="bell" size={22} className="mx-auto mb-2 text-warn" />
          Impossibile contattare la fonte dati{data.status ? ` (codice ${data.status})` : ""}. Riprova più tardi: la chiave potrebbe essere errata o il limite richieste superato.
        </div>
      )}

      {data.state === "ok" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Classifica */}
          <div className="lg:col-span-2">
            <Panel title="Classifica" className="brand-topline overflow-hidden">
              <StandingsTable table={data.table} teamId={data.teamId} />
            </Panel>
          </div>

          {/* Partite */}
          <div className="space-y-5">
            <Panel title="Prossime partite" className="brand-topline">
              {data.scheduled.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">Nessuna partita in programma.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.scheduled.map((m) => <MatchItem key={m.id} m={m} teamId={data.teamId} upcoming />)}
                </ul>
              )}
            </Panel>
            <Panel title="Ultimi risultati">
              {data.finished.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">Nessun risultato disponibile.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.finished.map((m) => <MatchItem key={m.id} m={m} teamId={data.teamId} />)}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Classifica -------------------------------------------------------------
function zoneColor(pos: number, total: number): string {
  if (pos <= 4) return "var(--good)"; // Champions
  if (pos <= 6) return "var(--elite)"; // Europa/Conference
  if (pos > total - 3) return "var(--bad)"; // retrocessione
  return "transparent";
}

function StandingsTable({ table, teamId }: { table: StandingRow[]; teamId: number | null }) {
  const total = table.length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-2">
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="py-2 text-left font-semibold">Squadra</th>
            <th className="px-2 py-2 text-center font-semibold">PG</th>
            <th className="px-2 py-2 text-center font-semibold">V</th>
            <th className="px-2 py-2 text-center font-semibold">N</th>
            <th className="px-2 py-2 text-center font-semibold">P</th>
            <th className="px-2 py-2 text-center font-semibold">DR</th>
            <th className="px-3 py-2 text-center font-semibold">Pti</th>
            <th className="hidden px-3 py-2 text-left font-semibold sm:table-cell">Forma</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r) => {
            const mine = r.teamId === teamId;
            return (
              <tr key={r.teamId} className={`border-b border-border last:border-0 ${mine ? "brand-soft-bg font-semibold" : ""}`}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-1 rounded-full" style={{ backgroundColor: zoneColor(r.position, total) }} />
                    {r.position}
                  </span>
                </td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    {r.crest && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.crest} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                    )}
                    <span className={mine ? "brand-text" : ""}>{r.team}</span>
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-muted">{r.played}</td>
                <td className="px-2 py-2 text-center text-muted">{r.won}</td>
                <td className="px-2 py-2 text-center text-muted">{r.draw}</td>
                <td className="px-2 py-2 text-center text-muted">{r.lost}</td>
                <td className="px-2 py-2 text-center text-muted">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                <td className="px-3 py-2 text-center font-bold">{r.points}</td>
                <td className="hidden px-3 py-2 sm:table-cell"><Form form={r.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Form({ form }: { form: string | null }) {
  if (!form) return <span className="text-muted-2">—</span>;
  const map: Record<string, string> = { W: "bg-emerald-500", D: "bg-amber-400", L: "bg-red-500" };
  return (
    <span className="flex gap-1">
      {form.split(",").slice(-5).map((f, i) => (
        <span key={i} className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white ${map[f.trim()] ?? "bg-slate-300"}`}>
          {f.trim() === "W" ? "V" : f.trim() === "D" ? "N" : f.trim() === "L" ? "P" : "·"}
        </span>
      ))}
    </span>
  );
}

// ---- Partite ----------------------------------------------------------------
function MatchItem({ m, teamId, upcoming }: { m: MatchRow; teamId: number | null; upcoming?: boolean }) {
  const d = new Date(m.utcDate);
  const date = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    <li className="px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-2">
        <span>{m.competition}</span>
        <span>{date}{upcoming ? ` · ${time}` : ""}</span>
      </div>
      <div className="flex items-center gap-2">
        <TeamSide name={m.homeTeam} crest={m.homeCrest} />
        <span className="shrink-0 px-1 text-sm font-bold tabular-nums">
          {upcoming || m.homeScore === null ? <span className="text-muted-2">vs</span> : `${m.homeScore} – ${m.awayScore}`}
        </span>
        <TeamSide name={m.awayTeam} crest={m.awayCrest} align="right" />
      </div>
    </li>
  );
}

function TeamSide({ name, crest, align }: { name: string; crest: string; align?: "right" }) {
  return (
    <span className={`flex flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {crest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />
      )}
      <span className="truncate text-[13px] font-medium">{name}</span>
    </span>
  );
}

// ---- Setup (nessuna chiave) -------------------------------------------------
function SetupCard() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card brand-topline p-6 lg:col-span-2">
        <div className="brand-soft-bg brand-text mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl"><Icon name="trophy" size={22} /></div>
        <h2 className="text-lg font-bold">Collega i dati live del campionato</h2>
        <p className="mt-1 text-sm text-muted">
          Sì, si può fare in modo <b>attendibile e sicuro</b> — tramite l&apos;API ufficiale <b>football-data.org</b> (gratuita per la Serie A),
          non con lo scraping di diretta.it (fragile, anti-bot, vietato dai ToS). Bastano due passi:
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <Step n={1}>
            Registrati gratis su <span className="brand-text font-semibold">football-data.org/client/register</span> e copia la tua API key.
          </Step>
          <Step n={2}>
            Crea il file <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">.env.local</code> nella root del progetto con:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-foreground p-3 text-[12px] text-white">FOOTBALL_DATA_API_KEY=la_tua_chiave</pre>
            poi riavvia il server. Classifica e risultati di Serie A si aggiornano da soli ogni 5 minuti.
          </Step>
        </ol>
      </div>
      <div className="card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Perché non diretta.it</div>
        <ul className="mt-2 space-y-2 text-[13px] text-muted">
          <li className="flex gap-2"><span className="text-bad">✕</span> Pagina in JS + anti-bot: si rompe spesso.</li>
          <li className="flex gap-2"><span className="text-bad">✕</span> ToS vietano lo scraping → rischio blocco.</li>
          <li className="flex gap-2"><span className="text-emerald-600">✓</span> API ufficiale: stabile, legale, dati strutturati.</li>
          <li className="flex gap-2"><span className="text-emerald-600">✓</span> Aggiornamento automatico dopo ogni gara.</li>
        </ul>
        <div className="mt-4 rounded-lg bg-background p-3 text-[12px] text-muted">
          In alternativa puoi inserire classifica e risultati <b>manualmente</b>: dimmelo e aggiungo l&apos;editor.
        </div>
      </div>
    </div>
  );
}

// ---- Competizione non nel piano (es. Serie B nel free tier) -----------------
function RestrictedCard({ competition }: { competition: string }) {
  return (
    <div className="card brand-topline p-6">
      <div className="brand-soft-bg brand-text mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl"><Icon name="trophy" size={22} /></div>
      <h2 className="text-lg font-bold">{competition}: non inclusa nel piano gratuito</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        La chiave è valida e i dati live funzionano, ma il free tier di <b>football-data.org</b> copre 12 competizioni
        (tra cui la Serie A) e <b>non la {competition}</b>: l&apos;API risponde con accesso negato.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4 text-[13px]">
          <div className="mb-1 font-semibold">Opzione A · piano a pagamento</div>
          <p className="text-muted">Attiva un piano football-data.org che includa la {competition} — poi è già tutto pronto, zero modifiche.</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-[13px]">
          <div className="mb-1 font-semibold">Opzione B · inserimento manuale</div>
          <p className="text-muted">Aggiungo un editor per inserire classifica e risultati a mano. Dimmelo e lo creo.</p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="brand-bg brand-on flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">{n}</span>
      <div className="flex-1 text-foreground/80">{children}</div>
    </li>
  );
}
