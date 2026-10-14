"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { t } from "@/i18n";
import { appUrl } from "@/lib/env";
import { backOfficeGate } from "@/lib/auth/rules";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { readExpert, validateExpert } from "@/lib/validation";
import type { FormState } from "./auth";

export async function createExpert(_: FormState, form: FormData): Promise<FormState> {
  // 1. L'appelant doit être admin, en double authentification.
  const { supabase, user, roles } = await getSession();
  if (!user) redirect("/connexion");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!roles.includes("admin") || backOfficeGate(roles, aal?.currentLevel ?? null, aal?.nextLevel ?? null) !== "ok") {
    return { error: t.admin.forbidden };
  }

  // 2. Validation
  const input = readExpert(form);
  const errors = validateExpert(input);
  const values = { full_name: input.full_name, email: input.email, experience: input.experience, fee: input.feeRaw, nda_signed_at: input.nda_signed_at ?? "" };
  if (Object.keys(errors).length > 0) return { errors, values };

  // 3. Invitation par email (seule opération qui exige la clé service).
  const h = await headers();
  const origin = process.env.APP_URL ? appUrl() : `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.full_name },
    redirectTo: `${origin}/auth/confirm?next=/mot-de-passe`,
  });
  if (inviteError || !invited.user) {
    if (inviteError?.code === "email_exists" || inviteError?.status === 422) {
      return { errors: { email: t.admin.emailTaken }, values };
    }
    return { error: t.auth.genericError, values };
  }
  const expertId = invited.user.id;

  // 4. Rôle et fiche : écrits avec le client de l'admin, donc soumis aux règles de la base.
  const steps = [
    () => supabase.from("user_roles").insert({ user_id: expertId, role: "expert", granted_by: user.id }),
    () =>
      supabase.from("expert_profiles").insert({
        user_id: expertId,
        domains: input.domains,
        experience: input.experience || null,
        fee_per_session_fcfa: input.fee,
        nda_signed: input.nda_signed,
        nda_signed_at: input.nda_signed ? input.nda_signed_at : null,
        active: input.active,
      }),
    () =>
      input.conflicts.length
        ? supabase.from("expert_conflicts").insert(input.conflicts.map((organization_id) => ({ expert_id: expertId, organization_id })))
        : Promise.resolve({ error: null }),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) {
      // Annule l'invitation pour ne pas laisser de compte à moitié créé.
      await admin.auth.admin.deleteUser(expertId);
      return { error: t.auth.genericError, values };
    }
  }

  await supabase.rpc("log_audit", {
    p_action: "expert_cree",
    p_object_type: "expert",
    p_object_id: expertId,
    p_details: { domains: input.domains, nda_signed: input.nda_signed },
  });
  redirect("/admin/experts?cree=1");
}
