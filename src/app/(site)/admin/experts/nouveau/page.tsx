import type { Metadata } from "next";
import { t } from "@/i18n";
import { requireAdmin } from "@/lib/auth/session";
import { ExpertForm } from "./ExpertForm";

export const metadata: Metadata = { title: t.admin.expertFormTitle };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const { data: organizations } = await supabase.from("organizations").select("id, name").order("name");
  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <div className="stack">
        <h1 className="text-h1">{t.admin.expertFormTitle}</h1>
        <p className="muted">{t.admin.expertFormLead}</p>
      </div>
      <ExpertForm organizations={organizations ?? []} />
    </div>
  );
}
