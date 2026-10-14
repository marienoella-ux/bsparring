"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import { signIn, type FormState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="stack">
      <FormError message={state.error} />
      <Field id="email" label={t.auth.email} type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} />
      <Field id="password" label={t.auth.password} type="password" autoComplete="current-password" />
      <SubmitButton>{t.auth.loginSubmit}</SubmitButton>
    </form>
  );
}
