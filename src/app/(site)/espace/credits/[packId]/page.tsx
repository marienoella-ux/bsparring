import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { fill, t } from "@/i18n";
import { requireRole } from "@/lib/auth/session";
import { formatPhone, getPurchaseConfig, type Pack, type PaymentMethod } from "@/lib/credits";
import { formatEurEquivalent, formatFcfa } from "@/lib/money";
import { DeclareForm } from "./DeclareForm";

export const metadata: Metadata = { title: t.purchase.title };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ packId: string }>;
  searchParams: Promise<{ operateur?: string }>;
}) {
  const { packId } = await params;
  const { operateur } = await searchParams;
  const { supabase } = await requireRole("dirigeant");
  const [{ data: pack }, { data: methods }, config] = await Promise.all([
    supabase.from("packs").select("id, name, credits, price_fcfa, pioneer_eligible").eq("id", packId).maybeSingle<Pack>(),
    supabase.from("payment_methods").select("operator, label, phone, beneficiary, ussd_code").order("sort_order").returns<PaymentMethod[]>(),
    getPurchaseConfig(supabase),
  ]);
  if (!pack) notFound();

  const p = t.purchase;
  const available = methods ?? [];
  const method = available.find((m) => m.operator === operateur) ?? available[0];
  const amount = formatFcfa(pack.price_fcfa);
  const pioneer = pack.pioneer_eligible && config?.pioneer_offer_available;

  return (
    <div className="page read stack-lg">
      <p><Link href="/espace/credits">{p.back}</Link></p>
      <div className="stack">
        <h1 className="text-h1">{fill(p.payTitle, { pack: pack.name })}</h1>
        {pioneer && <p className="alert alert-info">{fill(p.pioneerNote, { count: config!.pioneer_bonus_credits })}</p>}
      </div>

      <section className="bs-credits" aria-label={p.amountToPay}>
        <div className="bs-credits-main">
          <p className="bs-credits-label">{p.amountToPay}</p>
          <p><span className="amount">{amount}</span></p>
          <p className="bs-credits-exp">
            {pack.credits === 1 ? p.credit : fill(p.credits, { count: pack.credits })}
            {config?.eur_display_enabled ? ` · ${formatEurEquivalent(pack.price_fcfa)}` : ""}
          </p>
          {config?.eur_display_enabled && <p className="bs-credits-exp">{p.eurNote}</p>}
        </div>
      </section>

      {!config?.manual_payment_enabled ? (
        <p className="alert alert-info">{p.unavailable}</p>
      ) : !method ? (
        <p className="alert alert-info">{p.noMethod}</p>
      ) : (
        <>
          {available.length > 1 && (
            <div className="stack" style={{ gap: "var(--space-2)" }}>
              <p className="bs-field-label">{p.operator}</p>
              <nav className="segmented" aria-label={p.operator}>
                {available.map((m) => (
                  <Link
                    key={m.operator}
                    href={`/espace/credits/${pack.id}?operateur=${m.operator}`}
                    aria-current={m.operator === method.operator ? "true" : undefined}
                    replace
                    scroll={false}
                  >
                    {m.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          <Card title={`${p.stepsTitle} · ${method.label}`}>
            <div className="stack">
              <dl className="dl">
                <dt>{p.number}</dt>
                <dd>{formatPhone(method.phone)}</dd>
                <dt>{p.beneficiary}</dt>
                <dd>{method.beneficiary}</dd>
              </dl>
              <ol className="steps-pay">
                <li>{fill(p.step1, { ussd: method.ussd_code })}</li>
                <li>{p.step2}</li>
                <li>{fill(p.step3, { phone: formatPhone(method.phone), amount })}</li>
                <li>{fill(p.step4, { beneficiary: method.beneficiary })}</li>
                <li>{p.step5}</li>
              </ol>
              <p className="muted">{fill(p.delay, { delay: config.validation_delay_text })}</p>
            </div>
          </Card>

          <DeclareForm packId={pack.id} operator={method.operator} />
        </>
      )}
    </div>
  );
}
