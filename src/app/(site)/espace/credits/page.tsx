import type { Metadata } from "next";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { fill, t } from "@/i18n";
import { requireRole } from "@/lib/auth/session";
import { getPurchaseConfig, type Pack } from "@/lib/credits";
import { formatEurEquivalent, formatFcfa, pricePerSession } from "@/lib/money";

export const metadata: Metadata = { title: t.purchase.title };

export default async function Page() {
  const { supabase } = await requireRole("dirigeant");
  const [{ data: packs }, config] = await Promise.all([
    supabase.from("packs").select("id, name, credits, price_fcfa, pioneer_eligible").order("sort_order").returns<Pack[]>(),
    getPurchaseConfig(supabase),
  ]);
  const p = t.purchase;

  return (
    <div className="page read stack-lg">
      <div className="stack">
        <h1 className="text-h1">{p.title}</h1>
        <p className="muted">{fill(p.lead, { months: config?.credit_validity_months ?? 12 })}</p>
      </div>
      {!config?.manual_payment_enabled ? (
        <p className="alert alert-info">{p.unavailable}</p>
      ) : (
        <ul className="pack-list">
          {(packs ?? []).map((pack) => {
            const perSession = pricePerSession(pack.price_fcfa, pack.credits);
            const pioneer = pack.pioneer_eligible && config.pioneer_offer_available;
            return (
              <li key={pack.id} className="bs-card pack">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h2 className="bs-card-overline">{pack.name}</h2>
                  {pioneer && <Badge tone="cuivre">{fill(p.pioneerBadge, { count: config.pioneer_bonus_credits })}</Badge>}
                </div>
                <p>
                  <span className="pack-price">{formatFcfa(perSession)}</span> <span className="muted">{p.perSession}</span>
                </p>
                {config.eur_display_enabled && <p className="text-caption muted">{formatEurEquivalent(perSession)} {p.perSession}</p>}
                <p className="bs-card-meta">
                  {pack.credits === 1 ? p.credit : fill(p.credits, { count: pack.credits })} · {p.total} {formatFcfa(pack.price_fcfa)}
                </p>
                <div className="bs-card-footer">
                  <ButtonLink href={`/espace/credits/${pack.id}`} variant="secondary" block>{p.choose}</ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
