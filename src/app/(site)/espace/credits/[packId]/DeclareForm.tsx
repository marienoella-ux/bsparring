"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import type { FormState } from "@/lib/actions/auth";
import { declarePayment } from "@/lib/actions/credits";

export function DeclareForm({ packId, operator }: { packId: string; operator: string }) {
  const [state, action] = useActionState<FormState, FormData>(declarePayment, {});
  const p = t.purchase;
  return (
    <form action={action} className="stack">
      <FormError message={state.error} />
      <input type="hidden" name="pack_id" value={packId} />
      <input type="hidden" name="operator" value={operator} />
      <Field
        id="reference"
        label={p.reference}
        hint={p.referenceHint}
        placeholder={p.referencePlaceholder}
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={64}
        defaultValue={state.values?.reference}
        error={state.errors?.reference}
      />
      <SubmitButton>{p.submit}</SubmitButton>
    </form>
  );
}
