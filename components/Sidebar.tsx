"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENTS } from "@/lib/clients";
import { NAV, isGroup, isHeader, isSubLabel, sectionHref, type NavChild, type NavLeaf } from "@/lib/nav";
import { isLeagueSupported } from "@/lib/leagues";
import { BrandScope } from "./BrandScope";
import { Icon } from "./Icon";

export function Sidebar() {
  const pathname = usePathname();
  const match = pathname.match(/^\/clienti\/([^/]+)/);
  const activeClient = match ? CLIENTS.find((c) => c.id === match[1]) : undefined;

  return (
    <aside className="flex h-screen w-[270px] shrink-0 flex-col border-r border-border bg-surface/60">
      <Link href="/" className="block px-5 pb-4 pt-5">
        <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={150} height={38} className="h-9 w-auto" priority />
        <div className="mt-1.5 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-2">Performance CRM</div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {activeClient ? <ClientNav clientId={activeClient.id} pathname={pathname} /> : <PlatformNav pathname={pathname} />}
      </nav>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-[11px] text-muted-2">
        <span className="h-1.5 w-1.5 rounded-full bg-good" /> Partner informatico · TESTÀRE
      </div>
    </aside>
  );
}

function PlatformNav({ pathname }: { pathname: string }) {
  return (
    <>
      <NavLink href="/" icon="dashboard" label="Dashboard" active={pathname === "/"} />
      <SectionLabel>Clienti</SectionLabel>
      {CLIENTS.map((c) => (
        <Link key={c.id} href={`/clienti/${c.id}`} className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-background">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border" style={{ backgroundColor: c.colors.soft }}>
            <Image src={c.logo} alt={c.name} width={20} height={20} className="object-contain" />
          </span>
          <span className="flex-1">{c.name}</span>
          <Icon name="chevron" size={15} className="text-muted-2 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ))}
    </>
  );
}

function ClientNav({ clientId, pathname }: { clientId: string; pathname: string }) {
  const client = CLIENTS.find((c) => c.id === clientId)!;
  return (
    <>
      <Link href="/" className="mb-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground">
        <Icon name="arrowLeft" size={14} /> Tutti i clienti
      </Link>

      <div className="relative mb-3 overflow-hidden rounded-2xl px-3.5 py-3.5 shadow-sm" style={{ background: `linear-gradient(135deg, ${client.colors.primary}, ${client.colors.primaryDark})`, color: client.colors.onPrimary }}>
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20">
            <Image src={client.logo} alt={client.name} width={28} height={28} className="object-contain" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">{client.name}</div>
            <div className="text-[11px] opacity-85">{client.city}</div>
          </div>
        </div>
      </div>

      <BrandScope colors={client.colors}>
        {buildSections(clientId).map((section) => (
          <NavSection key={section.key} clientId={clientId} section={section} pathname={pathname} />
        ))}
      </BrandScope>
    </>
  );
}

interface NavSectionData {
  key: string;
  header?: string; // etichetta di sezione (assente per voci sciolte senza header)
  icon?: string; // icona dell'header (solo per i gruppi navigabili)
  hub?: string; // slug della landing del gruppo (header cliccabile)
  leaves: NavChild[];
}

/** Normalizza il NAV in sezioni uniformi: ogni header/gruppo raccoglie le sue voci. */
function buildSections(clientId: string): NavSectionData[] {
  const sections: NavSectionData[] = [];
  for (const item of NAV) {
    if (isHeader(item)) {
      sections.push({ key: `h:${item.header}`, header: item.header, leaves: [] });
    } else if (isGroup(item)) {
      sections.push({ key: `g:${item.group}`, header: item.group, icon: item.icon, hub: item.slug, leaves: item.children });
    } else {
      if (item.slug === "campionato" && !isLeagueSupported(clientId)) continue;
      const last = sections[sections.length - 1];
      // Le voci sciolte si attaccano a un header semplice (es. Squadra); dopo un gruppo o da sole fanno sezione a sé.
      if (last && last.header !== undefined && last.hub === undefined) {
        last.leaves.push(item);
      } else {
        sections.push({ key: `l:${item.slug || "home"}`, leaves: [item] });
      }
    }
  }
  return sections;
}

function NavSection({ clientId, section, pathname }: { clientId: string; section: NavSectionData; pathname: string }) {
  const { header, icon, hub, leaves } = section;
  const leafList = leaves.map((c, i) =>
    isSubLabel(c)
      ? <SubLabel key={`sub:${c.subLabel}:${i}`}>{c.subLabel}</SubLabel>
      : <Leaf key={c.slug || "home"} clientId={clientId} leaf={c} pathname={pathname} />,
  );
  return (
    <div className="mt-1 first:mt-0">
      {hub !== undefined ? (
        <Link
          href={sectionHref(clientId, hub)}
          className="group/g flex items-center gap-2 rounded-lg px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2 transition-colors hover:text-foreground"
        >
          {icon && <Icon name={icon} size={13} />}
          {header}
          <Icon name="chevron" size={12} className="opacity-0 transition-opacity group-hover/g:opacity-60" />
        </Link>
      ) : header !== undefined ? (
        <SectionLabel>{header}</SectionLabel>
      ) : null}
      {header !== undefined ? (
        <div className="ml-[18px] space-y-0.5 border-l border-border pl-2.5">{leafList}</div>
      ) : (
        leafList
      )}
    </div>
  );
}

function Leaf({ clientId, leaf, pathname }: { clientId: string; leaf: NavLeaf; pathname: string }) {
  const href = sectionHref(clientId, leaf.slug);
  const active = leaf.slug === "" ? pathname === href : pathname.startsWith(href);
  return <NavLink href={href} icon={leaf.icon} label={leaf.label} active={active} branded />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">{children}</div>;
}

/** Sotto-etichetta dentro un gruppo (es. "Data Analysis" sotto Area Performance). */
function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-0.5 pt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2/70">{children}</div>;
}

function NavLink({ href, icon, label, active, branded }: { href: string; icon: string; label: string; active: boolean; branded?: boolean }) {
  return (
    <Link
      href={href}
      className="group relative my-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all hover:bg-background"
      style={active ? (branded ? { backgroundColor: "var(--brand-soft)", color: "var(--brand-primary)" } : { backgroundColor: "var(--testare-ink)", color: "#fff" }) : undefined}
    >
      {active && branded && <span className="brand-bg absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" />}
      <span className={active ? "" : "text-muted-2 group-hover:text-muted"}><Icon name={icon} size={18} /></span>
      <span className={active ? "" : "text-foreground/75"}>{label}</span>
    </Link>
  );
}
