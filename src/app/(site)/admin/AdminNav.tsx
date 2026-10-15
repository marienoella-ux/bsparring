"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/i18n";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: t.admin.navHome, show: true },
    { href: "/admin/paiements", label: t.admin.navPayments, show: isAdmin },
    { href: "/admin/credits", label: t.admin.navCredits, show: isAdmin },
    { href: "/admin/experts", label: t.admin.navExperts, show: isAdmin },
    { href: "/admin/parametres", label: t.admin.navSettings, show: isAdmin },
  ];
  return (
    <nav className="bo-nav" aria-label={t.admin.title}>
      {items
        .filter((i) => i.show)
        .map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
              {i.label}
            </Link>
          );
        })}
    </nav>
  );
}
