import type { Metadata } from "next";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { t } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatFcfa } from "@/lib/format";

export const metadata: Metadata = { title: t.admin.navExperts };

type Row = {
  user_id: string;
  domains: (keyof typeof t.domains)[];
  fee_per_session_fcfa: number | null;
  nda_signed: boolean;
  nda_signed_at: string | null;
  active: boolean;
  profiles: { full_name: string; email: string } | null;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ cree?: string }> }) {
  const { supabase } = await requireAdmin();
  const { cree } = await searchParams;
  const { data } = await supabase
    .from("expert_profiles")
    .select("user_id, domains, fee_per_session_fcfa, nda_signed, nda_signed_at, active, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const experts = data ?? [];
  const a = t.admin;

  return (
    <div className="stack-lg">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="text-h1">{a.expertsTitle}</h1>
        <ButtonLink href="/admin/experts/nouveau">{a.newExpert}</ButtonLink>
      </div>
      {cree && <p className="alert alert-success" role="status">{a.created}</p>}
      {experts.length === 0 ? (
        <p className="muted">{a.expertsEmpty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{a.colName}</th>
                <th scope="col">{a.colDomains}</th>
                <th scope="col">{a.colFee}</th>
                <th scope="col">{a.colNda}</th>
                <th scope="col">{a.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((e) => (
                <tr key={e.user_id}>
                  <td>
                    <strong>{e.profiles?.full_name}</strong>
                    <br />
                    <span className="text-caption muted">{e.profiles?.email}</span>
                  </td>
                  <td>{e.domains.map((d) => t.domains[d]).join(", ")}</td>
                  <td>{e.fee_per_session_fcfa != null ? formatFcfa(e.fee_per_session_fcfa) : "—"}</td>
                  <td>
                    {e.nda_signed && e.nda_signed_at ? (
                      <Badge tone="success">{a.ndaSigned} {formatDate(e.nda_signed_at)}</Badge>
                    ) : (
                      <Badge tone="warning">{a.ndaMissing}</Badge>
                    )}
                  </td>
                  <td>{e.active ? <Badge tone="foret">{a.active}</Badge> : <Badge>{a.inactive}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
