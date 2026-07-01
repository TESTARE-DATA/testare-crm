"use client";

import { useMemo, useState } from "react";
import type { ReadinessState, ReItem } from "@/lib/readinessEngine-core";
import { RE_QUESTIONNAIRE, DOMS_AREAS, RE_CONFIG, FLAG_META } from "@/lib/readinessEngine-core";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui";

const fmtLong = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
type Screen = "oggi" | "checkin" | "carico";

/** Ore tra andata a letto e sveglia (gestisce il passaggio di mezzanotte). */
function hoursBetween(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export function VistaAtletaClient({ clientName, clientLogo, states }: { clientName: string; clientLogo: string; states: ReadinessState[] }) {
  const [sel, setSel] = useState(states[0]?.athlete.id ?? "");
  const st = useMemo(() => states.find((s) => s.athlete.id === sel) ?? states[0], [states, sel]);

  if (!st) return null;

  return (
    <div className="mx-auto max-w-[1080px] fade-up">
      <PageHeader title="Vista Atleta" subtitle="Anteprima di ciò che l'atleta vede sul proprio telefono — check-in mattutino, readiness e carico" icon="phone" />

      <div className="grid items-start gap-6 lg:grid-cols-[240px_1fr]">
        {/* Selettore atleta */}
        <div className="card p-2.5">
          <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Scegli atleta</div>
          <div className="max-h-[600px] space-y-0.5 overflow-y-auto">
            {states.map((s) => {
              const active = s.athlete.id === sel;
              const fm = FLAG_META[s.flag];
              return (
                <button key={s.athlete.id} onClick={() => setSel(s.athlete.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${active ? "brand-soft-bg brand-text font-semibold" : "hover:bg-background"}`}>
                  <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.baselineStatus === "provisional" ? "var(--muted-2)" : fm.color }} />
                  <span className="min-w-0 flex-1 truncate">{s.athlete.lastName} <span className="font-normal text-muted">{s.athlete.firstName}</span></span>
                  <span className="text-[10px] text-muted-2">#{s.athlete.shirtNumber}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Telefono */}
        <div className="flex flex-col items-center gap-4">
          <Phone key={st.athlete.id} st={st} clientName={clientName} clientLogo={clientLogo} />
          <p className="max-w-md text-center text-[12px] text-muted-2">Questo è ciò che vede l&apos;atleta dalla sua app: compila il check-in al risveglio e il carico dopo la seduta, e riceve un feedback semplice sulla prontezza. Gli alert e i dati completi restano allo staff.</p>
        </div>
      </div>
    </div>
  );
}

function Phone({ st, clientName, clientLogo }: { st: ReadinessState; clientName: string; clientLogo: string }) {
  const [screen, setScreen] = useState<Screen>("oggi");
  const [checkinDone, setCheckinDone] = useState(!!st.entry);
  const [loadDone, setLoadDone] = useState(st.load.daily > 0);

  return (
    <div className="relative w-[380px] max-w-full shrink-0 rounded-[2.4rem] border border-border bg-[#0b1220] p-2.5 shadow-xl">
      <div className="relative flex h-[720px] flex-col overflow-hidden rounded-[2rem] bg-background">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#0b1220]" />
        <div className="flex-1 overflow-y-auto pt-8">
          {screen === "oggi" && <ScreenOggi st={st} checkinDone={checkinDone} loadDone={loadDone} clientName={clientName} clientLogo={clientLogo} onCheckin={() => setScreen("checkin")} onLoad={() => setScreen("carico")} />}
          {screen === "checkin" && <ScreenCheckin st={st} onDone={() => setCheckinDone(true)} />}
          {screen === "carico" && <ScreenCarico st={st} loadDone={loadDone} onDone={() => setLoadDone(true)} />}
        </div>
        <div className="flex shrink-0 items-center justify-around border-t border-border bg-surface/95 px-2 py-2">
          {([["oggi", "home", "Oggi"], ["checkin", "clipboard", "Check-in"], ["carico", "load", "Carico"]] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setScreen(id)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors ${screen === id ? "brand-text" : "text-muted-2"}`}>
              <Icon name={icon} size={19} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function athleteMsg(st: ReadinessState): string {
  if (st.baselineStatus === "provisional") return "Stiamo imparando i tuoi valori normali. Continua i check-in ogni mattina: bastano pochi giorni.";
  if (st.flag === "red") return "Oggi la tua prontezza è sotto la norma. Lo staff lo sa e adatterà il lavoro — ascolta il tuo corpo.";
  if (st.flag === "amber") return "Prontezza un po' sotto la norma. Cura il recupero: sonno, idratazione e alimentazione fanno la differenza.";
  return "Sei pronto. Buon allenamento! 💪";
}

/** Riga di stato (compilato / da fare) cliccabile. */
function StatusCard({ icon, title, done, doneLabel, todoLabel, onClick }: { icon: string; title: string; done: boolean; doneLabel: string; todoLabel: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition-colors hover:bg-background">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${done ? "bg-emerald-50 text-emerald-600" : "brand-soft-bg brand-text"}`}><Icon name={icon} size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-[11px]" style={{ color: done ? "var(--good)" : "var(--muted-2)" }}>{done ? doneLabel : todoLabel}</span>
      </span>
      {done ? <span className="text-[var(--good)]"><Icon name="link" size={16} /></span> : <Icon name="chevron" size={16} className="text-muted-2" />}
    </button>
  );
}

function ScreenOggi({ st, checkinDone, loadDone, clientName, clientLogo, onCheckin, onLoad }: { st: ReadinessState; checkinDone: boolean; loadDone: boolean; clientName: string; clientLogo: string; onCheckin: () => void; onLoad: () => void }) {
  const fm = FLAG_META[st.flag];
  const provisional = st.baselineStatus === "provisional";
  const score = st.readinessScore;
  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clientLogo} alt={clientName} className="h-8 w-8 object-contain" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-tight">Ciao {st.athlete.firstName}</div>
          <div className="text-[11px] capitalize text-muted-2">{fmtLong(st.date)}</div>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-2">Privato</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl p-5 text-center" style={{ backgroundColor: provisional ? "var(--background)" : fm.bg }}>
        <div className="mx-auto flex h-28 w-28 items-center justify-center">
          <Ring value={provisional ? null : score} color={provisional ? "var(--muted-2)" : fm.color} />
        </div>
        <div className="mt-2 text-[13px] font-bold uppercase tracking-wide" style={{ color: provisional ? "var(--muted-2)" : fm.color }}>
          {provisional ? "Baseline in costruzione" : st.flag === "green" ? "Pronto" : st.flag === "amber" ? "Da monitorare" : "Recupero"}
        </div>
        <p className="mx-auto mt-1.5 max-w-[15rem] text-[12.5px] leading-snug text-foreground/80">{athleteMsg(st)}</p>
      </div>

      {st.clinicalFlag && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
          <Icon name="medical" size={15} className="mt-0.5 shrink-0" />
          <span>Hai segnalato indolenzimento a <b>{st.clinicalFlag.join(", ")}</b>. Lo staff medico è stato avvisato.</span>
        </div>
      )}

      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Da fare oggi</div>
      <StatusCard icon="clipboard" title="Check-in di oggi" done={checkinDone} doneLabel="Completato — tocca per rivederlo o modificarlo" todoLabel="Da compilare al risveglio" onClick={onCheckin} />
      <StatusCard icon="load" title="Carico della seduta" done={loadDone} doneLabel="Registrato — tocca per rivederlo" todoLabel="Da registrare dopo l'allenamento" onClick={onLoad} />

      <p className="px-1 text-center text-[10.5px] leading-snug text-muted-2">Questi dati aiutano lo staff a personalizzare il tuo lavoro. Non prevedono infortuni.</p>
    </div>
  );
}

function ScreenCheckin({ st, onDone }: { st: ReadinessState; onDone: () => void }) {
  const init = useMemo(() => {
    const o: Record<ReItem, number> = { fatigue: 4, doms: 4, sleep_quality: 4, sleep_hours: 7.5, stress: 4, mood: 4 };
    if (st.entry) for (const q of RE_QUESTIONNAIRE) { const v = st.entry[q.key]; if (typeof v === "number") o[q.key] = v; }
    return o;
  }, [st]);
  // Orari di default coerenti con le ore dormite dell'atleta (sveglia fissa 07:00).
  const defWake = "07:00";
  const defBed = useMemo(() => {
    let bedMin = 7 * 60 - Math.round(init.sleep_hours * 60);
    if (bedMin < 0) bedMin += 24 * 60;
    return `${String(Math.floor(bedMin / 60)).padStart(2, "0")}:${String(bedMin % 60).padStart(2, "0")}`;
  }, [init]);

  const [vals, setVals] = useState<Record<ReItem, number>>(init);
  const [areas, setAreas] = useState<string[]>(st.entry?.doms_area ?? []);
  const [sleepMode, setSleepMode] = useState<"ore" | "orari">("orari");
  const [bed, setBed] = useState(defBed);
  const [wake, setWake] = useState(defWake);
  const [sent, setSent] = useState(!!st.entry);

  const set = (k: ReItem, v: number) => { setVals((p) => ({ ...p, [k]: v })); setSent(false); };
  const setSleepTimes = (b: string, w: string) => { setBed(b); setWake(w); set("sleep_hours", hoursBetween(b, w)); };
  const toggleArea = (a: string) => { setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a])); setSent(false); };

  return (
    <div className="space-y-4 px-4 pb-6">
      <div>
        <h2 className="text-[16px] font-bold">Check-in mattutino</h2>
        <p className="mt-0.5 text-[11.5px] text-muted-2">Compila al risveglio, prima di ogni attività. È privato. Finestra {RE_CONFIG.morning_window_start}–{RE_CONFIG.morning_window_end}.</p>
      </div>

      {RE_QUESTIONNAIRE.map((q) => (
        <div key={q.key} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${q.color}1a`, color: q.color }}><Icon name={q.icon} size={15} /></span>
            <span className="flex-1 text-[13px] font-semibold">{q.label}{!q.required && <span className="ml-1 text-[10px] font-normal text-muted-2">(facoltativo)</span>}</span>
          </div>

          {q.kind === "hours" ? (
            <div>
              <div className="mb-2 inline-flex rounded-lg border border-border p-0.5 text-[11px]">
                <button onClick={() => setSleepMode("orari")} className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${sleepMode === "orari" ? "brand-bg brand-on" : "text-muted"}`}>Orari</button>
                <button onClick={() => setSleepMode("ore")} className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${sleepMode === "ore" ? "brand-bg brand-on" : "text-muted"}`}>Ore</button>
              </div>
              {sleepMode === "orari" ? (
                <div className="flex items-end gap-2">
                  <label className="flex-1 text-[11px] text-muted-2">A letto
                    <input type="time" value={bed} onChange={(e) => setSleepTimes(e.target.value, wake)} className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] font-semibold text-foreground" />
                  </label>
                  <label className="flex-1 text-[11px] text-muted-2">Sveglia
                    <input type="time" value={wake} onChange={(e) => setSleepTimes(bed, e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] font-semibold text-foreground" />
                  </label>
                  <div className="pb-1 text-right">
                    <div className="font-mono text-[18px] font-extrabold" style={{ color: q.color }}>{hoursBetween(bed, wake).toFixed(1)}h</div>
                    <div className="text-[9px] text-muted-2">calcolate</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input type="range" min={3.5} max={10} step={0.5} value={vals.sleep_hours} onChange={(e) => set("sleep_hours", Number(e.target.value))} className="flex-1" style={{ accentColor: q.color }} />
                  <span className="w-14 text-right font-mono text-[15px] font-bold" style={{ color: q.color }}>{vals.sleep_hours.toFixed(1)}h</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <input type="range" min={1} max={7} step={1} value={vals[q.key]} onChange={(e) => set(q.key, Number(e.target.value))} className="w-full" style={{ accentColor: q.color }} />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-muted-2">{q.anchors?.[0]}</span>
                <span className="text-[12px] font-bold" style={{ color: q.color }}>{vals[q.key]} · {q.anchors?.[vals[q.key] - 1]}</span>
                <span className="text-[11px] text-muted-2">{q.anchors?.[6]}</span>
              </div>
            </>
          )}

          {q.key === "doms" && vals.doms <= RE_CONFIG.doms_area_trigger && (
            <div className="mt-2.5 border-t border-border pt-2.5">
              <div className="mb-1.5 text-[11px] font-medium text-muted">Dove senti l&apos;indolenzimento?</div>
              <div className="flex flex-wrap gap-1.5">
                {DOMS_AREAS.map((a) => (
                  <button key={a} onClick={() => toggleArea(a)} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${areas.includes(a) ? "brand-bg brand-on" : "border border-border text-muted hover:bg-background"}`}>{a}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {sent ? (
        <div className="space-y-1.5 text-center">
          <div className="brand-soft-bg flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-[var(--good)]"><Icon name="link" size={16} /> Check-in inviato</div>
          <button onClick={() => setSent(false)} className="text-[12px] font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline">Ho sbagliato un dato — modifica</button>
        </div>
      ) : (
        <button onClick={() => { setSent(true); onDone(); }} className="brand-bg brand-on w-full rounded-xl py-3 text-[14px] font-bold shadow-sm transition-transform hover:scale-[1.01]">
          {st.entry ? "Salva modifiche" : "Invia il check-in"}
        </button>
      )}
    </div>
  );
}

const RPE_ANCHORS = ["Riposo", "Molto leggero", "Leggero", "Moderato", "Un po' duro", "Duro", "Duro +", "Molto duro", "Molto duro +", "Durissimo", "Massimale"];

function ScreenCarico({ st, loadDone, onDone }: { st: ReadinessState; loadDone: boolean; onDone: () => void }) {
  const last7 = st.history.slice(-7);
  const maxLoad = Math.max(1, ...last7.map((d) => d.dailyLoad));
  const wow = st.load.wowPct;
  const [rpe, setRpe] = useState(6);
  const [dur, setDur] = useState(75);
  const [sent, setSent] = useState(loadDone);
  const srpe = Math.round(rpe * dur);

  return (
    <div className="space-y-4 px-4 pb-6">
      <h2 className="text-[16px] font-bold">Il tuo carico</h2>

      {/* Registrazione seduta di oggi */}
      <div className="rounded-xl border border-border p-3.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-bold">Carico della seduta di oggi</span>
          {sent ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--good)]"><Icon name="link" size={13} /> Registrato</span> : <span className="text-[11px] font-medium text-muted-2">Da registrare</span>}
        </div>
        <p className="mb-3 text-[11px] text-muted-2">Compila ~{RE_CONFIG.rpe_delay_min} min dopo la fine della seduta.</p>

        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="font-medium">Sforzo percepito (RPE)</span>
          <span className="font-bold" style={{ color: "#e11d48" }}>{rpe} · {RPE_ANCHORS[rpe]}</span>
        </div>
        <input type="range" min={0} max={10} step={1} value={rpe} onChange={(e) => { setRpe(Number(e.target.value)); setSent(false); }} className="w-full" style={{ accentColor: "#e11d48" }} />

        <div className="mt-3 mb-1 flex items-center justify-between text-[12px]">
          <span className="font-medium">Durata</span>
          <span className="font-bold" style={{ color: "var(--brand-primary)" }}>{dur} min</span>
        </div>
        <input type="range" min={20} max={130} step={5} value={dur} onChange={(e) => { setDur(Number(e.target.value)); setSent(false); }} className="w-full" style={{ accentColor: "var(--brand-primary)" }} />

        <div className="mt-3 flex items-center justify-between rounded-lg bg-background px-3 py-2">
          <span className="text-[11px] text-muted-2">Carico seduta (sRPE = RPE × durata)</span>
          <span className="font-mono text-[16px] font-extrabold">{srpe.toLocaleString("it-IT")}</span>
        </div>

        {sent ? (
          <button onClick={() => setSent(false)} className="mt-2.5 w-full text-[12px] font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline">Modifica</button>
        ) : (
          <button onClick={() => { setSent(true); onDone(); }} className="brand-bg brand-on mt-2.5 w-full rounded-lg py-2.5 text-[13px] font-bold transition-transform hover:scale-[1.01]">Registra la seduta</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Settimana</div>
          <div className="mt-1 text-2xl font-extrabold">{st.load.weekly.toLocaleString("it-IT")}</div>
          <div className="text-[10.5px] text-muted-2">A.U. (sRPE)</div>
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Vs settimana prima</div>
          <div className="mt-1 text-2xl font-extrabold" style={{ color: wow > 15 ? "var(--warn)" : wow < -15 ? "var(--elite)" : "var(--foreground)" }}>{wow > 0 ? "+" : ""}{wow}%</div>
          <div className="text-[10.5px] text-muted-2">{st.load.spike ? "picco di carico" : "nella norma"}</div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Ultimi 7 giorni</div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
          {last7.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-[var(--brand-primary)]" style={{ height: `${(d.dailyLoad / maxLoad) * 60}px`, minHeight: 2, opacity: d.dailyLoad ? 1 : 0.25 }} />
              <span className="text-[9px] text-muted-2">{new Date(d.date + "T00:00:00Z").toLocaleDateString("it-IT", { weekday: "narrow", timeZone: "UTC" })}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="px-1 text-center text-[10.5px] leading-snug text-muted-2">Il carico è dato da RPE × durata di ogni seduta (sRPE). Serve a bilanciare lavoro e recupero.</p>
    </div>
  );
}

function Ring({ value, color }: { value: number | null; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = value == null ? c : c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute text-center">
        {value == null ? <Icon name="stopwatch" size={26} className="text-muted-2" /> : <span className="text-3xl font-extrabold" style={{ color }}>{value}</span>}
      </div>
    </div>
  );
}
