"use server";

import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { homePathFor, type Role } from "@/lib/auth/rules";
import { str } from "@/lib/validation";
import type { FormState } from "./auth";

export async function verifyTotp(_: FormState, form: FormData): Promise<FormState> {
  const factorId = str(form, "factor_id");
  const code = str(form, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { errors: { code: t.mfa.invalidCode } };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/connexion");

  // Le facteur doit appartenir au compte connecté.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (!factors?.all.some((f) => f.id === factorId)) {
    return { error: t.auth.genericError };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { errors: { code: t.mfa.invalidCode } };

  await supabase.rpc("log_audit", { p_action: "mfa_verifiee", p_object_type: "compte", p_object_id: userData.user.id });
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
  redirect(homePathFor((roles ?? []).map((r) => r.role as Role)));
}
