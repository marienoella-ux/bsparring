import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, Select } from "@/components/Field";
import { t } from "@/i18n";
import { adjustCredits } from "@/lib/actions/admin-credits";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { Feedback } from "../Feedback";

export const metadata: Metadata = { title: t.admin.creditsTitle };

type Dirigeant = { user_id: string; profiles: { full_name: string; email: string; organizations: { name: string } | null } | null };
type Movement = {
  id: number;
  type: keyof typeof t.movementTypes;
  delta: number;
  reason: string | null;
  created_at: string;
  dirigeant: { full_name: string } | null;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { supabase } = await requireAdmin();
  const { ok, erreur } = await searchParams;
  const now = new Date().toISOString();
  const [{ data: dirigeants }, { data: lots }, { data: movements }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, profiles!user_roles_user_id_fkey(full_name, email, organizations(name))")
      .eq("role", "dirigeant")
      .returns<Dirigeant[]>(),
    supabase.from("credit_lots").select("dirigeant_id, remaining, expires_at").gt("remaining", 0).gt("expires_at", now).order("expires_at"),
    supabase
      .from("credit_movements")
      .select("id, type, delta, reason, created_at, dirigeant:profiles!credit_movements_dirigeant_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Movement[]>(),
  ]);

  const balances = new Map<string, { credits: number; nextExpiry: string }>();
  for (const lot of lots ?? []) {
    const b = balances.get(lot.dirigeant_id);
    if (b) b.credits += lot.remaining;
    else balances.set(lot.dirigeant_id, { credits: lot.remaining, nextExpiry: lot.expires_at });
  }
  const people = (dirigeants ?? []).sort((x, y) => (x.profiles?.full_name ?? "").localeCompare(y.profiles?.full_name ?? ""));
  const a = t.admin;

  return (
    <div className="stack-lg">
      <h1 className="text-h1">{a.creditsTitle}</h1>
      <Feedback ok={ok} erreur={erreur} messages={{ ajuste: a.adjusted }} />

      <Card title={a.adjustTitle}>
        <form action={adjustCredits} className="stack">
          <p className="muted">{a.adjustLead}</p>
          <Select id="dirigeant_id" label={a.adjustDirigeant}>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.profiles?.full_name} — {p.profiles?.organizations?.name ?? p.profiles?.email}
              </option>
            ))}
          </Select>
          <Field id="delta" label={a.adjustDelta} hint={a.adjustDeltaHint} inputMode="numeric" pattern="-?[0-9]+" />
          <Field id="reason" label={a.adjustReason} maxLength={200} />
          <div><Button type="submit">{a.adjustSubmit}</Button></div>
        </form>
      </Card>

      <section className="stack">
        <h2 className="text-h2">{a.balancesTitle}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">{a.colDirigeant}</th><th scope="col">{a.colBalance}</th><th scope="col">{t.dirigeant.validUntil.replace(" {date}", "")}</th></tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const b = balances.get(p.user_id);
                return (
                  <tr key={p.user_id}>
                    <td>{p.profiles?.full_name}<br /><span className="text-caption muted">{p.profiles?.organizations?.name}</span></td>
                    <td>{b?.credits ?? 0}</td>
                    <td>{b ? formatDate(b.nextExpiry) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack">
        <h2 className="text-h2">{a.journalTitle}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">{a.colDate}</th><th scope="col">{a.colDirigeant}</th><th scope="col">{a.colType}</th><th scope="col">{a.colDelta}</th><th scope="col">{a.colReason}</th></tr>
            </thead>
            <tbody>
              {(movements ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td>{m.dirigeant?.full_name}</td>
                  <td>{t.movementTypes[m.type]}</td>
                  <td>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td>{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
