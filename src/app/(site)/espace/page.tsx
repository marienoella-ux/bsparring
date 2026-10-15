import type { Metadata } from "next";
import { Badge, type BadgeTone } from "@/components/Badge";
import { Card } from "@/components/Card";
import { CreditBalance } from "@/components/CreditBalance";
import { fill, t } from "@/i18n";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatFcfa } from "@/lib/format";

export const metadata: Metadata = { title: t.dirigeant.title };

const STATUS_TONE: Record<string, BadgeTone> = { en_attente_validation: "info", confirme: "success", refuse: "danger" };
const DAY = 24 * 60 * 60 * 1000;

export default async function Page({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const { supabase, user } = await requireUser();
  const { paiement } = await searchParams;
  const [{ data: profile }, { data: lots }, { data: payments }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("credit_lots")
      .select("remaining, expires_at")
      .eq("dirigeant_id", user.id)
      .gt("remaining", 0)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at"),
    supabase
      .from("payments")
      .select("id, pack_name, amount_fcfa, status, rejection_reason, declared_at, pioneer_bonus_credits")
      .eq("dirigeant_id", user.id)
      .order("declared_at", { ascending: false })
      .limit(10),
    supabase.rpc("purchase_config"),
  ]);

  const credits = (lots ?? []).reduce((sum, l) => sum + l.remaining, 0);
  const first = lots?.[0];
  const alertDays = Number(config?.credit_expiry_alert_days ?? 30);
  const expiringSoon = first ? new Date(first.expires_at).getTime() - Date.now() < alertDays * DAY : false;
  const d = t.dirigeant;

  return (
    <div className="page read stack-lg">
      <div className="stack">
        <p className="text-overline overline-cuivre">{d.title}</p>
        <h1 className="text-h1">{d.welcome}{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
      </div>
      {paiement === "declare" && (
        <p className="alert alert-success" role="status">{fill(d.paymentDeclared, { delay: String(config?.validation_delay_text ?? "") })}</p>
      )}
      <CreditBalance
        credits={credits}
        expiresOn={first ? formatDate(first.expires_at) : undefined}
        expiringSoon={expiringSoon}
        expiringCount={first?.remaining}
      />
      <Card title={d.dilemmasTitle}>
        <p className="muted">{d.dilemmasEmpty}</p>
      </Card>
      <Card title={d.deliverablesTitle}>
        <p className="muted">{d.deliverablesEmpty}</p>
      </Card>
      <Card title={d.paymentsTitle}>
        {payments && payments.length > 0 ? (
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {payments.map((p) => (
              <li key={p.id} className="stack" style={{ gap: "var(--space-1)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{p.pack_name} · {formatFcfa(p.amount_fcfa)}</strong>
                  <Badge tone={STATUS_TONE[p.status]}>{t.paymentStatus[p.status as keyof typeof t.paymentStatus]}</Badge>
                </div>
                <span className="text-caption muted">{formatDate(p.declared_at)}</span>
                {p.status === "refuse" && p.rejection_reason && <span className="text-caption">{p.rejection_reason}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{d.paymentsEmpty}</p>
        )}
      </Card>
    </div>
  );
}
