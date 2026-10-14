"use client";

import { useActionState } from "react";
import { Field, FormError, TextArea } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import type { FormState } from "@/lib/actions/auth";
import { createExpert } from "@/lib/actions/experts";

const DOMAINS = Object.entries(t.domains) as [string, string][];

export function ExpertForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createExpert, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const a = t.admin;
  return (
    <form action={action} className="stack" noValidate>
      <FormError message={state.error} />
      <Field id="full_name" label={t.signup.fullName} defaultValue={v.full_name} error={e.full_name} />
      <Field id="email" label={t.auth.email} type="email" inputMode="email" defaultValue={v.email} error={e.email} />

      <fieldset aria-describedby={e.domains ? "domains-msg" : undefined}>
        <legend>{a.domains}</legend>
        {DOMAINS.map(([key, label]) => (
          <label className="check" key={key}>
            <input type="checkbox" name="domains" value={key} />
            <span>{label}</span>
          </label>
        ))}
        {e.domains && <p id="domains-msg" className="bs-field-msg bs-field-error">{e.domains}</p>}
      </fieldset>

      <TextArea id="experience" label={a.experience} placeholder={a.experiencePlaceholder} optional defaultValue={v.experience} />
      <Field id="fee" label={a.fee} inputMode="numeric" optional defaultValue={v.fee} error={e.fee} />

      <fieldset>
        <legend>{a.colNda}</legend>
        <label className="check">
          <input type="checkbox" name="nda_signed" />
          <span>{a.ndaSignedLabel}</span>
        </label>
        <Field id="nda_signed_at" label={a.ndaDate} type="date" optional hint={a.ndaHint} defaultValue={v.nda_signed_at} error={e.nda_signed_at} />
      </fieldset>

      <fieldset>
        <legend>{a.conflicts}</legend>
        <p className="bs-field-msg">{a.conflictsHint}</p>
        {organizations.length === 0 ? (
          <p className="text-caption muted">{a.conflictsEmpty}</p>
        ) : (
          organizations.map((o) => (
            <label className="check" key={o.id}>
              <input type="checkbox" name="conflicts" value={o.id} />
              <span>{o.name}</span>
            </label>
          ))
        )}
      </fieldset>

      <label className="check">
        <input type="checkbox" name="active" defaultChecked />
        <span>{a.activeLabel}</span>
      </label>

      <SubmitButton>{a.createSubmit}</SubmitButton>
    </form>
  );
}
