import type { Metadata } from "next";
import { t } from "@/i18n";
import { requireBackOffice } from "@/lib/auth/session";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: { default: t.admin.title, template: `%s · ${t.admin.title}` } };
export const dynamic = "force-dynamic";

// Toute page du back-office exige : rôle admin ou facilitateur ET double authentification.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { roles } = await requireBackOffice();
  return (
    <div className="page wide bo">
      <AdminNav isAdmin={roles.includes("admin")} />
      {children}
    </div>
  );
}
