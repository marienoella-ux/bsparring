"use client";

import { Button, ButtonLink } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { t } from "@/i18n";

// Toute erreur imprévue côté serveur : message clair, sans détail technique.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page narrow stack-lg">
      <Logo size={32} />
      <div className="stack">
        <h1 className="text-h1">{t.errors.errorTitle}</h1>
        <p>{t.errors.errorText}</p>
      </div>
      <div className="row">
        <Button onClick={() => reset()}>{t.errors.retry}</Button>
        <ButtonLink href="/" variant="quiet">{t.errors.home}</ButtonLink>
      </div>
    </main>
  );
}
