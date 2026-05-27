"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconDice, IconClipboard, IconTrophy, IconCoin } from "./icons";

const ALL_NAV_ITEMS = [
  { label: "Início",   href: "/home",     Icon: IconHome,      adminOnly: false },
  { label: "Sortear",  href: "/sortear",  Icon: IconDice,      adminOnly: true  },
  { label: "Partidas", href: "/partidas", Icon: IconClipboard, adminOnly: false },
  { label: "Ranking",  href: "/ranking",  Icon: IconTrophy,    adminOnly: false },
  { label: "Bolão",    href: "/bolao",    Icon: IconCoin,      adminOnly: false },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex bg-bg-deep border-t border-border shrink-0 pb-safe">
      {items.map(({ label, href, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-[3px] transition-colors
              ${active ? "text-mint" : "text-text-faint hover:text-text-dim"}`}
          >
            <Icon />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
