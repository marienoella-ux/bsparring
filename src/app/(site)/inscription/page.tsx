import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: t.signup.title };

export default function Page() {
  return (
    <div className="page narrow stack-lg">
      <div className="stack">
        <h1 className="text-h1">{t.signup.title}</h1>
        <p className="muted">{t.signup.lead}</p>
      </div>
      <SignupForm />
      <p>
        <Link href="/connexion">{t.nav.login}</Link>
      </p>
    </div>
  );
}
