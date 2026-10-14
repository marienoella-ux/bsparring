"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import type { FormState } from "@/lib/actions/auth";
import { verifyTotp } from "@/lib/actions/mfa";

export function TotpForm({ factorId }: { factorId: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyTotp, {});
  return (
    <form action={action} className="stack">
      <FormError message={state.error} />
      <input type="hidden" name="factor_id" value={factorId} />
      <Field
        id="code"
        label={t.mfa.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        error={state.errors?.code}
      />
      <SubmitButton>{t.mfa.submit}</SubmitButton>
    </form>
  );
}
