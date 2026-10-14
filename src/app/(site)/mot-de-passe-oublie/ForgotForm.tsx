"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import { requestPasswordReset, type FormState } from "@/lib/actions/auth";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});
  if (state.ok) return <p className="alert alert-success" role="status">{t.auth.forgotSent}</p>;
  return (
    <form action={action} className="stack">
      <Field id="email" label={t.auth.email} type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
      <SubmitButton>{t.auth.forgotSubmit}</SubmitButton>
    </form>
  );
}
