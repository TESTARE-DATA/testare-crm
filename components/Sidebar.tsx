"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENTS } from "@/lib/clients";
import { NAV, isGroup, isHeader, sectionHref, type NavLeaf } from "@/lib/nav";
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
        {NAV.filter((item) => isHeader(item) || isGroup(item) || item.slug !== "campionato" || isLeagueSupported(clientId)).map((item) => {
          if (isHeader(item)) {
            return <SectionLabel key={item.header}>{item.header}</SectionLabel>;
          }
          if (isGroup(item)) {
            return (
              <div key={item.group} className="mt-3">
                <Link
                  href={sectionHref(clientId, item.slug)}
                  className="group/g flex items-center gap-2 rounded-lg px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-2 transition-colors hover:text-foreground"
                >
                  <Icon name={item.icon} size={13} /> {item.group}
                  <Icon name="chevron" size={12} className="opacity-0 transition-opacity group-hover/g:opacity-60" />
                </Link>
                <div className="ml-[18px] space-y-0.5 border-l border-border pl-2.5">
                  {item.children.map((c) => (
                    <Leaf key={c.slug} clientId={clientId} leaf={c} pathname={pathname} />
                  ))}
                </div>
              </div>
            );
          }
          return <Leaf key={item.slug || "home"} clientId={clientId} leaf={item} pathname={pathname} />;
        })}
      </BrandScope>
    </>
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
