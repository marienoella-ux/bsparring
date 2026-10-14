"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/i18n";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: t.admin.navHome, show: true },
    { href: "/admin/experts", label: t.admin.navExperts, show: isAdmin },
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
