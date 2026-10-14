import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: t.auth.loginTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <div className="page narrow stack-lg">
      <h1 className="text-h1">{t.auth.loginTitle}</h1>
      {erreur === "lien" && <p className="alert alert-danger" role="alert">{t.auth.linkInvalid}</p>}
      <LoginForm />
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <p><Link href="/mot-de-passe-oublie">{t.auth.forgot}</Link></p>
        <p>{t.auth.noAccount} <Link href="/inscription">{t.auth.signupLink}</Link></p>
      </div>
    </div>
  );
}
