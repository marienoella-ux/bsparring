import type { Metadata } from "next";
import { Card } from "@/components/Card";
import { t } from "@/i18n";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: t.expert.title };

export default async function Page() {
  const { supabase, user } = await requireRole("expert");
  const [{ data: profile }, { data: expert }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("expert_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const e = t.expert;
  return (
    <div className="page read stack-lg">
      <div className="stack">
        <p className="text-overline overline-cuivre">{e.title}</p>
        <h1 className="text-h1">{e.welcome}{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
      </div>
      {!expert && <p className="alert alert-info">{e.noProfile}</p>}
      <Card title={e.invitationsTitle}>
        <p className="muted">{e.invitationsEmpty}</p>
      </Card>
    </div>
  );
}
