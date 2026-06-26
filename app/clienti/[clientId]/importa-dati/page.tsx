import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getImports } from "@/lib/data";
import type { ImportStatus } from "@/lib/types";
import { Badge, PageHeader, Panel, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";

const STATUS_TONE: Record<ImportStatus, "green" | "amber" | "red"> = {
  completato: "green",
  "in corso": "amber",
  errore: "red",
};

const SOURCES = [
  { name: "GPS / Tracking", desc: "Catapult, STATSports, Polar", icon: "live" },
  { name: "Test fisici", desc: "ForceDecks, Optojump, cronometri", icon: "stopwatch" },
  { name: "CSV / Excel", desc: "Rosa, anagrafiche, risultati", icon: "upload" },
  { name: "Wearable", desc: "Heart rate, sonno, recupero", icon: "load" },
];

export default async function ImportaDatiPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  const jobs = getImports(clientId).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Importa Dati"
        subtitle="Sorgenti esterne che alimentano automaticamente le sezioni dell'app"
        icon="upload"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Job totali" value={jobs.length} icon="upload" />
        <StatCard label="Completati" value={jobs.filter((j) => j.status === "completato").length} tone="good" />
        <StatCard label="In corso" value={jobs.filter((j) => j.status === "in corso").length} tone="warn" />
        <StatCard label="Righe importate" value={jobs.reduce((s, j) => s + j.rows, 0).toLocaleString("it-IT")} tone="brand" />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Nuova importazione</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SOURCES.map((s) => (
          <button key={s.name} className="card flex flex-col items-start gap-2 p-4 text-left transition-shadow hover:shadow-md">
            <span className="brand-soft-bg brand-text flex h-10 w-10 items-center justify-center rounded-lg">
              <Icon name={s.icon} size={20} />
            </span>
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="text-[12px] text-muted">{s.desc}</div>
          </button>
        ))}
      </div>

      <Panel title="Storico importazioni">
        <ul className="divide-y divide-border">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-3">
              <span className="brand-soft-bg brand-text flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon name="upload" size={16} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{j.source}</div>
                <div className="text-[12px] text-muted">→ {j.target} · {j.rows.toLocaleString("it-IT")} righe · {fmt(j.date)}</div>
              </div>
              <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}
