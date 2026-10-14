import type { Metadata } from "next";
import { Card } from "@/components/Card";
import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: t.dirigeant.title };

export default async function Page() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const d = t.dirigeant;
  return (
    <div className="page read stack-lg">
      <div className="stack">
        <p className="text-overline overline-cuivre">{d.title}</p>
        <h1 className="text-h1">{d.welcome}{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
      </div>
      <section className="bs-credits" aria-label={d.creditsLabel}>
        <div className="bs-credits-main">
          <p className="bs-credits-label">{d.creditsLabel}</p>
          <p><span className="bs-credits-num">0</span></p>
          <p className="bs-credits-exp">{d.creditsSoon}</p>
        </div>
      </section>
      <Card title={d.dilemmasTitle}>
        <p className="muted">{d.dilemmasEmpty}</p>
      </Card>
      <Card title={d.deliverablesTitle}>
        <p className="muted">{d.deliverablesEmpty}</p>
      </Card>
    </div>
  );
}
