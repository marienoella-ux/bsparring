import { t, fill } from "@/i18n";
import { ButtonLink } from "./Button";

type Props = { credits: number; expiresOn?: string; expiringSoon?: boolean; expiringCount?: number };

// Solde de crédits du dirigeant : la première information de « Mon espace ».
export function CreditBalance({ credits, expiresOn, expiringSoon, expiringCount = 0 }: Props) {
  const d = t.dirigeant;
  return (
    <section className="bs-credits" aria-label={d.creditsLabel}>
      <div className="bs-credits-main">
        <p className="bs-credits-label">{d.creditsLabel}</p>
        <p><span className="bs-credits-num">{credits}</span></p>
        {expiresOn && (
          <p className={expiringSoon ? "bs-credits-exp bs-credits-exp-soon" : "bs-credits-exp"}>
            {expiringSoon ? fill(d.expiringSoon, { count: expiringCount, date: expiresOn }) : fill(d.validUntil, { date: expiresOn })}
          </p>
        )}
      </div>
      <ButtonLink href="/espace/credits" variant={credits === 0 ? "primary" : "secondary"}>
        {credits === 0 ? d.buy : d.recharge}
      </ButtonLink>
    </section>
  );
}
