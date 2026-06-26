"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Mesocycle, MesocycleType, PlanDay, PlanIntensity, PlanMeta, PlanWeek } from "@/lib/types";
import { useLocalCollection } from "@/lib/store";
import { SESSION_OBJECTIVES, objectiveMeta } from "@/lib/objectives";
import { mdCode, mdColor } from "@/lib/microcycle";
import {
  INTENSITY_LEVELS, INTENSITY_META, MESO_META, MESO_TYPES,
  defaultMeta, defaultMesocycles, fmtRange, generateWeeks, isoMonday,
  mesoForDate, type PlanWeekSlot,
} from "@/lib/plan";
import { Icon } from "@/components/Icon";
import { Modal, ModalHeader } from "@/components/Modal";
import { Panel } from "@/components/ui";

const TODAY = "2026-06-19";
const DOW = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const TACTICAL = SESSION_OBJECTIVES.campo!.groups;
const PHYSICAL = SESSION_OBJECTIVES.palestra!.groups;

// Palette DEDICATA al Piano: famiglie separate per non sovrapporsi alla Fase
// (colori mesocicli) né tra le due aree. Area Tecnica = fredda (blu/teal),
// Area Performance = calda (ambra/rosa). Chiave = gruppo obiettivo (lib/objectives).
const OBJ_COLOR: Record<string, string> = {
  // Area Tecnica (campo)
  "Fase offensiva": "#0ea5e9",
  "Fase difensiva": "#1d4ed8",
  "Transizioni e situazioni": "#6366f1",
  "Tecnica": "#0d9488",
  // Area Performance (palestra)
  "Condizionamento metabolico": "#f59e0b",
  "Condizionamento muscolare": "#ea580c",
  "Locomozione": "#e11d48",
  "Prevenzione-solidità": "#db2777",
};
const AREA_TECNICA = "#1d4ed8"; // colore identità Area Tecnica
const AREA_PERFORMANCE = "#ea580c"; // colore identità Area Performance
function objColor(label?: string): string | undefined {
  const g = objectiveMeta(label)?.group;
  return g ? OBJ_COLOR[g] : undefined;
}

export function PianoView({ clientId, seedMatchDates }: { clientId: string; seedMatchDates: string[] }) {
  const metaCol = useLocalCollection<PlanMeta>(`plan-meta:${clientId}`);
  const mesoCol = useLocalCollection<Mesocycle>(`plan-meso:${clientId}`);
  const weekCol = useLocalCollection<PlanWeek>(`plan-week:${clientId}`);
  const dayCol = useLocalCollection<PlanDay>(`plan-day:${clientId}`);
  const eventsCol = useLocalCollection<CalendarEvent>(`events:${clientId}`);

  // Seed di default al primo accesso (quando lo store è pronto e vuoto).
  useEffect(() => {
    if (metaCol.ready && metaCol.items.length === 0) metaCol.add(defaultMeta(clientId));
  }, [metaCol.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mesoCol.ready && mesoCol.items.length === 0) defaultMesocycles(clientId).forEach(mesoCol.add);
  }, [mesoCol.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = metaCol.items[0] ?? defaultMeta(clientId);
  const mesos = useMemo(
    () => [...mesoCol.items].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [mesoCol.items],
  );

  const matchDates = useMemo(() => {
    const local = eventsCol.items.filter((e) => e.sessionType === "partita").map((e) => e.date);
    return [...new Set([...seedMatchDates, ...local])];
  }, [eventsCol.items, seedMatchDates]);

  const weeks = useMemo(() => generateWeeks(meta.seasonStart, meta.seasonEnd), [meta.seasonStart, meta.seasonEnd]);
  const weekMap = useMemo(() => new Map(weekCol.items.map((w) => [w.id, w])), [weekCol.items]);
  const dayMap = useMemo(() => new Map(dayCol.items.map((d) => [d.id, d])), [dayCol.items]);

  // Raggruppa le settimane per mese (in base al lunedì della settimana).
  const months = useMemo(() => {
    const order: { key: string; label: string; slots: PlanWeekSlot[] }[] = [];
    const byKey = new Map<string, { key: string; label: string; slots: PlanWeekSlot[] }>();
    for (const w of weeks) {
      const key = w.weekStart.slice(0, 7);
      if (!byKey.has(key)) {
        const o = { key, label: monthLabel(w.weekStart), slots: [] as PlanWeekSlot[] };
        byKey.set(key, o);
        order.push(o);
      }
      byKey.get(key)!.slots.push(w);
    }
    return order;
  }, [weeks]);

  const todayMonday = isoMonday(TODAY);
  const [editMeso, setEditMeso] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailSlot = detailId ? weeks.find((w) => w.id === detailId) ?? null : null;

  const upsertWeek = (weekStart: string, patch: Partial<PlanWeek>) => {
    if (weekMap.has(weekStart)) weekCol.update(weekStart, patch);
    else weekCol.add({ id: weekStart, clientId, weekStart, ...patch });
  };
  const upsertDay = (date: string, patch: Partial<PlanDay>) => {
    if (dayMap.has(date)) dayCol.update(date, patch);
    else dayCol.add({ id: date, clientId, date, ...patch });
  };

  return (
    <div className="fade-up">
      {/* ---- Macrociclo: timeline stagione (snella) ---- */}
      <Panel
        title={<><Icon name="calendar" size={16} className="brand-text" /> {meta.name}</>}
        action={
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-muted-2 sm:inline">{fmtRange(meta.seasonStart, meta.seasonEnd)} · {weeks.length} microcicli</span>
            <button
              onClick={() => setEditMeso((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground"
            >
              <Icon name="layers" size={14} /> {editMeso ? "Chiudi" : "Mesocicli"}
            </button>
          </div>
        }
        className="mb-5"
      >
        <div className="p-4">
          <SeasonBar mesos={mesos} weeks={weeks} weekMap={weekMap} todayMonday={todayMonday} onOpen={(id) => setDetailId(id)} />
        </div>
      </Panel>

      {editMeso && (
        <MesoManager
          mesos={mesos}
          onAdd={(m) => mesoCol.add(m)}
          onUpdate={(id, patch) => mesoCol.update(id, patch)}
          onRemove={(id) => mesoCol.remove(id)}
          clientId={clientId}
          seasonEnd={meta.seasonEnd}
        />
      )}

      {/* ---- Panoramica annuale: mesi × settimane (2 aree) ---- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {months.map((m) => (
          <MonthCard
            key={m.key}
            label={m.label}
            slots={m.slots}
            weekMap={weekMap}
            mesos={mesos}
            matchDates={matchDates}
            todayMonday={todayMonday}
            onWeekPatch={upsertWeek}
            onOpen={(id) => setDetailId(id)}
          />
        ))}
      </div>

      {detailSlot && (
        <DayDetailModal
          slot={detailSlot}
          wk={weekMap.get(detailSlot.id)}
          meso={mesoForDate(detailSlot.weekStart, mesos)}
          dayMap={dayMap}
          matchDates={matchDates}
          onWeekPatch={(patch) => upsertWeek(detailSlot.weekStart, patch)}
          onDayPatch={upsertDay}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

// ---- Card mese --------------------------------------------------------------
function MonthCard({
  label, slots, weekMap, mesos, matchDates, todayMonday, onWeekPatch, onOpen,
}: {
  label: string; slots: PlanWeekSlot[]; weekMap: Map<string, PlanWeek>; mesos: Mesocycle[];
  matchDates: string[]; todayMonday: string;
  onWeekPatch: (weekStart: string, patch: Partial<PlanWeek>) => void; onOpen: (id: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-foreground/80">{label}</h3>
        <div className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-2">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: AREA_TECNICA }} />Tecnica</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: AREA_PERFORMANCE }} />Performance</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {slots.map((slot) => {
          const wk = weekMap.get(slot.id);
          const meso = mesoForDate(slot.weekStart, mesos);
          const isCurrent = slot.weekStart === todayMonday;
          const hasMatch = slot.days.some((d) => matchDates.includes(d));
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-2 px-3 py-2 ${isCurrent ? "bg-[var(--brand-soft)]" : ""}`}
              style={{ borderLeft: `3px solid ${meso ? MESO_META[meso.type].color : "transparent"}` }}
            >
              <button onClick={() => onOpen(slot.id)} className="flex w-9 shrink-0 flex-col items-start" title={`Apri microciclo ${slot.index} (giorno per giorno)`}>
                <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-2">Sett</span>
                <span className={`text-base font-extrabold leading-none ${isCurrent ? "brand-text" : ""}`}>{slot.index}</span>
              </button>
              <BadgeSelect groups={TACTICAL} value={wk?.tacticalFocus} placeholder="Tecnica" onChange={(v) => onWeekPatch(slot.weekStart, { tacticalFocus: v })} />
              <BadgeSelect groups={PHYSICAL} value={wk?.physicalFocus} placeholder="Performance" onChange={(v) => onWeekPatch(slot.weekStart, { physicalFocus: v })} />
              <button onClick={() => onOpen(slot.id)} className="ml-auto flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-2 hover:text-foreground" title="Apri dettaglio">
                {hasMatch && <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" title="Gara in settimana" />}
                {fmtDM(slot.weekStart)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Badge-select obiettivo (pillola colorata, modificabile) ----------------
function BadgeSelect({
  groups, value, onChange, placeholder,
}: {
  groups: { group: string; color: string; items: { label: string; acr: string }[] }[];
  value?: string; onChange: (v: string | undefined) => void; placeholder: string;
}) {
  const color = objColor(value);
  return (
    <div className="relative min-w-0 flex-1">
      <select
        className="w-full cursor-pointer appearance-none truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold outline-none transition-colors"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        title={value ?? placeholder}
        style={
          value
            ? { color, borderColor: color, backgroundColor: hexA(color!, 0.12) }
            : { color: "var(--muted-2)", borderStyle: "dashed", borderColor: "var(--border-strong)", backgroundColor: "transparent" }
        }
      >
        <option value="">— {placeholder}</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group.toUpperCase()}>
            {g.items.map((it) => (
              <option key={it.label} value={it.label}>{it.label} · {it.acr}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ---- Modal dettaglio: microciclo giorno per giorno --------------------------
function DayDetailModal({
  slot, wk, meso, dayMap, matchDates, onWeekPatch, onDayPatch, onClose,
}: {
  slot: PlanWeekSlot; wk?: PlanWeek; meso?: Mesocycle; dayMap: Map<string, PlanDay>; matchDates: string[];
  onWeekPatch: (patch: Partial<PlanWeek>) => void; onDayPatch: (date: string, patch: Partial<PlanDay>) => void; onClose: () => void;
}) {
  const intensity = wk?.intensity;
  return (
    <Modal onClose={onClose} size="xl">
      <ModalHeader
        title={`Microciclo ${slot.index}`}
        subtitle={<>{fmtRange(slot.weekStart, slot.weekEnd)}{meso ? ` · ${meso.name}` : ""}</>}
        onClose={onClose}
        accent={meso ? MESO_META[meso.type].color : undefined}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* Focus settimana + carico */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Obiettivo Area Tecnica (settimana)">
            <SelectObj groups={TACTICAL} value={wk?.tacticalFocus} placeholder="Area Tecnica" onChange={(v) => onWeekPatch({ tacticalFocus: v })} tone={AREA_TECNICA} />
          </Field>
          <Field label="Obiettivo Area Performance (settimana)">
            <SelectObj groups={PHYSICAL} value={wk?.physicalFocus} placeholder="Area Performance" onChange={(v) => onWeekPatch({ physicalFocus: v })} tone={AREA_PERFORMANCE} />
          </Field>
          <Field label="Carico settimana">
            <select
              className="inp py-2 text-[13px]"
              value={intensity ?? ""}
              onChange={(e) => onWeekPatch({ intensity: (e.target.value || undefined) as PlanIntensity | undefined })}
              style={intensity ? { borderColor: INTENSITY_META[intensity].color, color: INTENSITY_META[intensity].color, fontWeight: 600 } : undefined}
            >
              <option value="">Non impostato</option>
              {INTENSITY_LEVELS.map((i) => <option key={i} value={i}>{INTENSITY_META[i].label}</option>)}
            </select>
          </Field>
        </div>

        {/* Griglia giorni */}
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Giorno per giorno</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {slot.days.map((date, i) => (
            <DayCell
              key={date}
              date={date}
              dow={DOW[i]}
              day={dayMap.get(date)}
              isMatch={matchDates.includes(date)}
              md={mdCode(date, matchDates)}
              onPatch={(patch) => onDayPatch(date, patch)}
            />
          ))}
        </div>

        {/* Nota settimana */}
        <div className="mt-4">
          <Field label="Note del microciclo">
            <textarea
              className="inp min-h-[64px] py-2 text-[13px]"
              placeholder="Indicazioni della settimana (es. doppia seduta mercoledì, scarico pre-gara…)"
              value={wk?.note ?? ""}
              onChange={(e) => onWeekPatch({ note: e.target.value || undefined })}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ---- Cella giorno (nel modal) -----------------------------------------------
function DayCell({
  date, dow, day, isMatch, md, onPatch,
}: {
  date: string; dow: string; day?: PlanDay; isMatch: boolean; md: { code: string; offset: number };
  onPatch: (patch: Partial<PlanDay>) => void;
}) {
  const isToday = date === TODAY;
  // La codifica MD ha senso solo nel microciclo attorno alla gara (≈ MD-6 → MD+3).
  const showMd = isMatch || Math.abs(md.offset) <= 6;
  return (
    <div className={`rounded-xl border bg-surface p-2 ${isToday ? "border-[var(--brand-primary)]" : "border-border"}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted">{dow} {date.slice(8, 10)}</span>
        {showMd && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: isMatch ? "#dc2626" : mdColor(md.offset) }}>{md.code}</span>}
      </div>
      {isMatch ? (
        <div className="rounded-lg bg-[#dc2626]/10 px-2 py-3 text-center text-[11px] font-bold text-[#dc2626]">GARA</div>
      ) : (
        <div className="space-y-1.5">
          <SelectObj compact groups={TACTICAL} value={day?.tacticalObjective} placeholder="Tecnica" onChange={(v) => onPatch({ tacticalObjective: v })} tone={AREA_TECNICA} />
          <SelectObj compact groups={PHYSICAL} value={day?.physicalObjective} placeholder="Performance" onChange={(v) => onPatch({ physicalObjective: v })} tone={AREA_PERFORMANCE} />
        </div>
      )}
    </div>
  );
}

// ---- Select obiettivo standard (modal) --------------------------------------
function SelectObj({
  groups, value, onChange, placeholder, tone, compact = false,
}: {
  groups: { group: string; color: string; items: { label: string; acr: string }[] }[];
  value?: string; onChange: (v: string | undefined) => void; placeholder: string; tone: string; compact?: boolean;
}) {
  const color = objColor(value) ?? tone;
  return (
    <div className="relative w-full">
      <select
        className={`inp w-full appearance-none truncate ${compact ? "py-1 pl-6 pr-2 text-[11px]" : "py-2 pl-7 pr-2 text-[13px]"}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        title={value ?? placeholder}
        style={value ? { borderColor: color } : undefined}
      >
        <option value="">{placeholder}…</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group.toUpperCase()}>
            {g.items.map((it) => <option key={it.label} value={it.label}>{it.label} · {it.acr}</option>)}
          </optgroup>
        ))}
      </select>
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm ${compact ? "left-1.5 h-2 w-2" : "left-2.5 h-2.5 w-2.5"}`}
        style={{ backgroundColor: value ? color : "var(--border)" }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-2">{label}</span>
      {children}
    </label>
  );
}

// ---- Timeline stagione: griglia di quadratini settimanali (3 righe allineate)
function SeasonBar({
  mesos, weeks, weekMap, todayMonday, onOpen,
}: {
  mesos: Mesocycle[]; weeks: PlanWeekSlot[]; weekMap: Map<string, PlanWeek>; todayMonday: string; onOpen: (id: string) => void;
}) {
  const cell = (slot: PlanWeekSlot, color: string | undefined, sub: string) => {
    const isCurrent = slot.weekStart === todayMonday;
    return (
      <button
        key={slot.id}
        onClick={() => onOpen(slot.id)}
        title={`Microciclo ${slot.index} · ${fmtRange(slot.weekStart, slot.weekEnd)}${sub ? ` · ${sub}` : ""}`}
        className={`relative h-4 flex-1 rounded-[3px] transition-transform hover:scale-y-125 ${isCurrent ? "z-10 ring-2 ring-[var(--brand-primary)]" : ""} ${color ? "" : "border border-dashed border-border"}`}
        style={color ? { backgroundColor: color } : { backgroundColor: "var(--background)" }}
      />
    );
  };
  const Row = ({ label, render }: { label: string; render: (slot: PlanWeekSlot) => React.ReactNode }) => (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-right text-[9px] font-bold uppercase tracking-wide text-muted-2">{label}</span>
      <div className="flex flex-1 gap-[2px]">{weeks.map(render)}</div>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <Row label="Fase" render={(s) => { const m = mesoForDate(s.weekStart, mesos); return cell(s, m ? MESO_META[m.type].color : undefined, m?.name ?? ""); }} />
      <Row label="Area Tecnica" render={(s) => cell(s, objColor(weekMap.get(s.id)?.tacticalFocus), weekMap.get(s.id)?.tacticalFocus ?? "—")} />
      <Row label="Area Performance" render={(s) => cell(s, objColor(weekMap.get(s.id)?.physicalFocus), weekMap.get(s.id)?.physicalFocus ?? "—")} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-28 pt-1.5 text-[11px] text-muted-2">
        {mesos.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MESO_META[m.type].color }} />
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- Gestione mesocicli -----------------------------------------------------
function MesoManager({
  mesos, onAdd, onUpdate, onRemove, clientId, seasonEnd,
}: {
  mesos: Mesocycle[]; onAdd: (m: Mesocycle) => void; onUpdate: (id: string, patch: Partial<Mesocycle>) => void;
  onRemove: (id: string) => void; clientId: string; seasonEnd: string;
}) {
  const addNew = () => {
    const last = mesos[mesos.length - 1];
    onAdd({
      id: `meso-${Math.abs(Date.now() % 1e9).toString(36)}`,
      clientId, name: "Nuovo mesociclo", type: "competitivo", startDate: last ? last.endDate : "2025-07-07", endDate: seasonEnd, focus: "",
    });
  };
  return (
    <Panel className="mb-5" title="Mesocicli · fasi della stagione">
      <div className="divide-y divide-border">
        {mesos.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: MESO_META[m.type].color }} />
            <input className="inp w-auto min-w-[160px] flex-1 py-1 text-[13px] font-medium" value={m.name} onChange={(e) => onUpdate(m.id, { name: e.target.value })} />
            <select className="inp w-auto py-1 text-[12px]" value={m.type} onChange={(e) => onUpdate(m.id, { type: e.target.value as MesocycleType })}>
              {MESO_TYPES.map((t) => <option key={t} value={t}>{MESO_META[t].label}</option>)}
            </select>
            <input type="date" className="inp w-auto py-1 text-[12px]" value={m.startDate} onChange={(e) => onUpdate(m.id, { startDate: e.target.value })} />
            <input type="date" className="inp w-auto py-1 text-[12px]" value={m.endDate} onChange={(e) => onUpdate(m.id, { endDate: e.target.value })} />
            <button onClick={() => onRemove(m.id)} className="rounded p-1.5 text-muted-2 hover:text-red-600" title="Rimuovi">✕</button>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <button onClick={addNew} className="brand-text inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <Icon name="link" size={14} /> Aggiungi mesociclo
        </button>
      </div>
    </Panel>
  );
}

// ---- helper -----------------------------------------------------------------
function monthLabel(iso: string): string {
  const d = new Date(Date.parse(iso + "T00:00:00Z"));
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
}
function fmtDM(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
/** "#rrggbb" → rgba con alpha. */
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
