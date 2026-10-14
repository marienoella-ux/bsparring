import type { Metadata } from "next";
import { t } from "@/i18n";

export const metadata: Metadata = { title: t.legal.termsTitle };

// Texte fourni par Brainiacs après relecture juridique.
export default function Page() {
  return (
    <div className="page read stack">
      <h1 className="text-h1">{t.legal.termsTitle}</h1>
      <p className="alert alert-info">{t.legal.pending}</p>
    </div>
  );
}
