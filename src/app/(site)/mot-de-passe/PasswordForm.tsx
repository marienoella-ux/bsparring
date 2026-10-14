"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import { setPassword, type FormState } from "@/lib/actions/auth";

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form action={action} className="stack">
      <FormError message={state.error} />
      <Field id="password" label={t.auth.password} hint={t.auth.passwordHint} type="password" autoComplete="new-password" minLength={12} error={state.errors?.password} />
      <SubmitButton>{t.auth.setPasswordSubmit}</SubmitButton>
    </form>
  );
}
