"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { t } from "@/i18n";
import { appUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_MIN, isEmail, normalizePhone, readSignup, str, validateSignup, type FieldErrors } from "@/lib/validation";

export type FormState = { error?: string; errors?: FieldErrors; ok?: boolean; values?: Record<string, string> };

async function origin() {
  // URL publique configurée ; à défaut, l'hôte de la requête (prévisualisations).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.APP_URL ? appUrl() : `${proto}://${host}`;
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const input = readSignup(form);
  const errors = validateSignup(input);
  const { password: _pw, terms: _t, confidentiality: _c, ...values } = input;
  if (Object.keys(errors).length > 0) return { errors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/tableau`,
      // Lu par le déclencheur handle_new_user : ne donne jamais d'autre rôle que « dirigeant ».
      data: {
        signup: "dirigeant",
        full_name: input.full_name,
        job_title: input.job_title,
        organization_name: input.organization_name,
        sector: input.sector,
        country: input.country,
        whatsapp_phone: normalizePhone(input.whatsapp_phone),
        terms_accepted: "true",
        confidentiality_accepted: "true",
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { errors: { email: t.signup.emailTaken }, values };
    if (error.code === "weak_password") return { errors: { password: t.auth.passwordTooShort }, values };
    return { error: t.auth.genericError, values };
  }
  // Confirmation d'email désactivée (test local) : la session existe déjà.
  if (data.session) redirect("/tableau");
  redirect("/inscription/confirmation");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: t.auth.emailNotConfirmed, values: { email } };
    return { error: t.auth.loginError, values: { email } };
  }
  redirect("/tableau");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  if (!isEmail(email)) return { errors: { email: t.signup.emailInvalid }, values: { email } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?next=/mot-de-passe`,
  });
  // Même message que le compte existe ou non : on ne révèle pas qui est inscrit.
  return { ok: true };
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (password.length < PASSWORD_MIN) return { errors: { password: t.auth.passwordTooShort } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password") return { errors: { password: t.auth.passwordTooShort } };
    return { error: t.auth.genericError };
  }
  redirect("/tableau");
}
