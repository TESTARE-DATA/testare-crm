import Image from "next/image";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getAthletes, getMedical } from "@/lib/data";
import { TESTARE } from "@/lib/brand";
import { BrandScope } from "@/components/BrandScope";
import { BrandVars } from "@/components/BrandVars";
import { Icon } from "@/components/Icon";
import { TopBarActions } from "@/components/TopBarActions";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = getClient(clientId);
  if (!client) notFound();

  return (
    <BrandScope colors={client.colors} className="brand-cards relative min-h-full">
      <BrandVars colors={client.colors} />

      {/* Logo societario in filigrana — "questo è proprio in tema <società>" */}
      <Image
        src={client.logo}
        alt=""
        aria-hidden
        width={620}
        height={620}
        className="brand-watermark"
        priority={false}
      />

      {/* Top bar brandizzata (glass) */}
      <header className="glass sticky top-0 z-20 border-b border-border">
        <div className="grad-line" />
        <div className="flex items-center justify-between px-8 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border" style={{ backgroundColor: client.colors.soft }}>
              <Image src={client.logo} alt={client.name} width={26} height={26} className="object-contain" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">{client.name}</div>
              <div className="text-[11px] text-muted">{client.city} · {client.foundedYear}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <TopBarActions clientId={clientId} athletes={getAthletes(clientId)} medical={getMedical(clientId)} />
            <a
              href={TESTARE.website}
              target="_blank"
              rel="noopener noreferrer"
              title={`Realizzato da ${TESTARE.name} — vai al sito`}
              className="group ml-1 flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2.5 transition-all hover:border-foreground/15 hover:shadow-sm"
            >
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-2 sm:inline">by</span>
              <Image src={TESTARE.logo} alt={TESTARE.name} width={74} height={18} className="h-[18px] w-auto" />
              <Icon name="link" size={13} className="text-muted-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </header>

      <div className="relative z-[1] px-8 py-7">{children}</div>
    </BrandScope>
  );
}
