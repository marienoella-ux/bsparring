import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { fill, t } from "@/i18n";
import { confirmPayment, rejectPayment } from "@/lib/actions/admin-credits";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { formatFcfa } from "@/lib/money";
import { Feedback } from "../Feedback";

export const metadata: Metadata = { title: t.admin.paymentsTitle };

type Row = {
  id: string;
  pack_name: string;
  credits: number;
  amount_fcfa: number;
  operator: keyof typeof t.operators | null;
  external_reference: string;
  status: keyof typeof t.paymentStatus;
  rejection_reason: string | null;
  pioneer_bonus_credits: number;
  declared_at: string;
  dirigeant: { full_name: string; email: string; organizations: { name: string } | null } | null;
};

const TONE: Record<string, BadgeTone> = { en_attente_validation: "info", confirme: "success", refuse: "danger" };

export default async function Page({ searchParams }: { searchParams: Promise<{ onglet?: string; ok?: string; erreur?: string }> }) {
  const { supabase } = await requireAdmin();
  const { onglet, ok, erreur } = await searchParams;
  const history = onglet === "historique";
  const a = t.admin;

  let query = supabase
    .from("payments")
    .select(
      "id, pack_name, credits, amount_fcfa, operator, external_reference, status, rejection_reason, pioneer_bonus_credits, declared_at, dirigeant:profiles!payments_dirigeant_id_fkey(full_name, email, organizations(name))",
    );
  query = history
    ? query.order("declared_at", { ascending: false }).limit(100)
    : query.eq("status", "en_attente_validation").order("declared_at", { ascending: true });
  const { data } = await query.returns<Row[]>();
  const rows = data ?? [];
  const overdueMs = 24 * 60 * 60 * 1000;

  return (
    <div className="stack-lg">
      <h1 className="text-h1">{a.paymentsTitle}</h1>
      <nav className="segmented" aria-label={a.paymentsTitle}>
        <Link href="/admin/paiements" aria-current={!history ? "true" : undefined}>{a.tabPending}</Link>
        <Link href="/admin/paiements?onglet=historique" aria-current={history ? "true" : undefined}>{a.tabHistory}</Link>
      </nav>
      <Feedback ok={ok} erreur={erreur} messages={{ valide: a.confirmed, refuse: a.rejected }} />

      {rows.length === 0 ? (
        <p className="muted">{history ? a.historyEmpty : a.pendingEmpty}</p>
      ) : history ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{a.colDeclared}</th>
                <th scope="col">{a.colDirigeant}</th>
                <th scope="col">{a.colPack}</th>
                <th scope="col">{a.colAmount}</th>
                <th scope="col">{a.colReference}</th>
                <th scope="col">{a.colPaymentStatus}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.declared_at)}</td>
                  <td>{r.dirigeant?.full_name}<br /><span className="text-caption muted">{r.dirigeant?.organizations?.name}</span></td>
                  <td>{r.pack_name}</td>
                  <td>{formatFcfa(r.amount_fcfa)}</td>
                  <td><code>{r.external_reference}</code></td>
                  <td>
                    <Badge tone={TONE[r.status]}>{t.paymentStatus[r.status]}</Badge>
                    {r.pioneer_bonus_credits > 0 && <> <Badge tone="cuivre">{fill(a.pioneerApplied, { count: r.pioneer_bonus_credits })}</Badge></>}
                    {r.rejection_reason && <><br /><span className="text-caption">{r.rejection_reason}</span></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((r) => {
            const overdue = Date.now() - new Date(r.declared_at).getTime() > overdueMs;
            return (
              <li key={r.id} className="bs-card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h2 className="bs-card-title">{r.dirigeant?.full_name}</h2>
                  {overdue && <Badge tone="warning">{a.overdue}</Badge>}
                </div>
                <p className="bs-card-meta">{r.dirigeant?.organizations?.name} · {r.dirigeant?.email}</p>
                <dl className="dl">
                  <dt>{a.colPack}</dt><dd>{r.pack_name} ({r.credits})</dd>
                  <dt>{a.colAmount}</dt><dd>{formatFcfa(r.amount_fcfa)}</dd>
                  <dt>{a.colOperator}</dt><dd>{r.operator ? t.operators[r.operator] : "—"}</dd>
                  <dt>{a.colReference}</dt><dd><code>{r.external_reference}</code></dd>
                  <dt>{a.colDeclared}</dt><dd>{formatDateTime(r.declared_at)}</dd>
                </dl>
                <div className="bs-card-footer" style={{ alignItems: "flex-end" }}>
                  <form action={confirmPayment}>
                    <input type="hidden" name="payment_id" value={r.id} />
                    <Button type="submit">{a.confirm}</Button>
                  </form>
                  <form action={rejectPayment} className="inline-form" style={{ flex: 1 }}>
                    <input type="hidden" name="payment_id" value={r.id} />
                    <div className="bs-field">
                      <label className="bs-field-label" htmlFor={`reason-${r.id}`}>{a.rejectReason}</label>
                      <input id={`reason-${r.id}`} name="reason" className="bs-input" required placeholder={a.rejectReasonPlaceholder} />
                    </div>
                    <Button type="submit" variant="secondary">{a.reject}</Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
