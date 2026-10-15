import type { Metadata } from "next";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { fill, t } from "@/i18n";
import { savePack, savePaymentMethod, saveSettings } from "@/lib/actions/admin-credits";
import { requireAdmin } from "@/lib/auth/session";
import { Feedback } from "../Feedback";

export const metadata: Metadata = { title: t.admin.settingsTitle };

type PackRow = { id: string; name: string; credits: number; price_fcfa: number; pioneer_eligible: boolean; active: boolean };
type MethodRow = { operator: keyof typeof t.operators; label: string; phone: string; beneficiary: string; active: boolean };

function Check({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} defaultChecked={checked} />
      <span>{label}{hint && <><br /><span className="text-caption muted">{hint}</span></>}</span>
    </label>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase } = await requireAdmin();
  const { ok, erreur } = await searchParams;
  const [{ data: packs }, { data: methods }, { data: settingRows }, { count: pioneerUsed }] = await Promise.all([
    supabase.from("packs").select("id, name, credits, price_fcfa, pioneer_eligible, active").order("sort_order").returns<PackRow[]>(),
    supabase.from("payment_methods").select("operator, label, phone, beneficiary, active").order("sort_order").returns<MethodRow[]>(),
    supabase.from("settings").select("key, value"),
    supabase.from("payments").select("id", { count: "exact", head: true }).gt("pioneer_bonus_credits", 0),
  ]);
  const s = Object.fromEntries((settingRows ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const a = t.admin;
  const limit = Number(s.pioneer_offer_limit ?? 10);

  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <h1 className="text-h1">{a.settingsTitle}</h1>
      <Feedback ok={ok} erreur={erreur} messages={{ enregistre: a.settingsSaved }} />

      <section className="stack">
        <h2 className="text-h2">{a.packsTitle}</h2>
        {[...(packs ?? []), null].map((p) => (
          <Card key={p?.id ?? "nouveau"} title={p ? undefined : a.packAdd} headingLevel="h3">
            <form action={savePack} className="stack">
              {p && <input type="hidden" name="id" value={p.id} />}
              <Field id={`name-${p?.id ?? "new"}`} name="name" label={a.packName} defaultValue={p?.name} maxLength={80} />
              <div className="grid-2">
                <Field id={`credits-${p?.id ?? "new"}`} name="credits" label={a.packCredits} inputMode="numeric" defaultValue={p?.credits} />
                <Field id={`price-${p?.id ?? "new"}`} name="price_fcfa" label={a.packPrice} inputMode="numeric" defaultValue={p?.price_fcfa} />
              </div>
              <Check name="pioneer_eligible" label={a.packPioneer} checked={p?.pioneer_eligible ?? false} />
              <Check name="active" label={a.packActive} checked={p?.active ?? true} />
              <div><Button type="submit" variant="secondary">{p ? a.packSave : a.packAdd}</Button></div>
            </form>
          </Card>
        ))}
      </section>

      <section className="stack">
        <h2 className="text-h2">{a.methodsTitle}</h2>
        {(methods ?? []).map((m) => (
          <Card key={m.operator} title={m.label} headingLevel="h3">
            <form action={savePaymentMethod} className="stack">
              <input type="hidden" name="operator" value={m.operator} />
              <Field id={`phone-${m.operator}`} name="phone" label={a.methodPhone} type="tel" defaultValue={m.phone} optional placeholder="+237 6 00 00 00 00" />
              <Field id={`beneficiary-${m.operator}`} name="beneficiary" label={a.methodBeneficiary} hint={a.methodBeneficiaryHint} defaultValue={m.beneficiary} optional maxLength={120} />
              <Check name="active" label={a.methodActive} checked={m.active} hint={!m.phone || !m.beneficiary ? a.methodIncomplete : undefined} />
              <div><Button type="submit" variant="secondary">{a.packSave}</Button></div>
            </form>
          </Card>
        ))}
      </section>

      <form action={saveSettings} className="stack-lg">
        <Card title={a.pioneerTitle} headingLevel="h2">
          <div className="stack">
            <p><Badge tone={Number(pioneerUsed ?? 0) >= limit ? "warning" : "cuivre"}>{fill(a.pioneerCounter, { used: pioneerUsed ?? 0, limit })}</Badge></p>
            <Check name="pioneer_offer_enabled" label={a.pioneerEnabled} checked={s.pioneer_offer_enabled === true} />
            <div className="grid-2">
              <Field id="pioneer_offer_limit" label={a.pioneerLimit} inputMode="numeric" defaultValue={String(s.pioneer_offer_limit ?? 10)} />
              <Field id="pioneer_bonus_credits" label={a.pioneerBonus} inputMode="numeric" defaultValue={String(s.pioneer_bonus_credits ?? 1)} />
            </div>
          </div>
        </Card>
        <Card title={a.rulesTitle} headingLevel="h2">
          <div className="stack">
            <Field id="credit_validity_months" label={a.validityMonths} hint={a.validityHint} inputMode="numeric" defaultValue={String(s.credit_validity_months ?? 12)} />
            <Field id="cancellation_threshold_hours" label={a.cancelHours} inputMode="numeric" defaultValue={String(s.cancellation_threshold_hours ?? 24)} />
            <Field id="payment_validation_delay_text" label={a.delayText} defaultValue={String(s.payment_validation_delay_text ?? "sous 24 h ouvrées")} maxLength={80} />
            <Check name="manual_payment_enabled" label={a.manualEnabled} checked={s.manual_payment_enabled !== false} />
            <Check name="eur_display_enabled" label={a.eurEnabled} hint={a.eurHint} checked={s.eur_display_enabled === true} />
          </div>
        </Card>
        <div><Button type="submit">{a.settingsSubmit}</Button></div>
      </form>
    </div>
  );
}
