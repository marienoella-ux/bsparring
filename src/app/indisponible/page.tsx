import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.errors.unavailableTitle };

// Hors du groupe (site) : cette page ne doit pas dépendre de Supabase.
export default function Page() {
  return (
    <main className="page narrow stack-lg">
      <Logo size={32} />
      <div className="stack">
        <h1 className="text-h1">{t.errors.unavailableTitle}</h1>
        <p>{t.errors.unavailableText}</p>
      </div>
    </main>
  );
}
