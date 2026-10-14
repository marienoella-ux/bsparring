"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { t } from "@/i18n";
import { signUp, type FormState } from "@/lib/actions/auth";

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const s = t.signup;
  return (
    <form action={action} className="stack" noValidate>
      <FormError message={state.error} />
      <Field id="full_name" label={s.fullName} placeholder={s.fullNamePlaceholder} autoComplete="name" defaultValue={v.full_name} error={e.full_name} />
      <Field id="job_title" label={s.jobTitle} placeholder={s.jobTitlePlaceholder} autoComplete="organization-title" defaultValue={v.job_title} error={e.job_title} />
      <Field id="organization_name" label={s.organization} placeholder={s.organizationPlaceholder} autoComplete="organization" defaultValue={v.organization_name} error={e.organization_name} />
      <Field id="sector" label={s.sector} placeholder={s.sectorPlaceholder} defaultValue={v.sector} error={e.sector} />
      <Field id="country" label={s.country} autoComplete="country-name" defaultValue={v.country ?? "Cameroun"} error={e.country} />
      <Field id="whatsapp_phone" label={s.whatsapp} hint={s.whatsappHint} type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.whatsapp_phone ?? "+237 "} error={e.whatsapp_phone} />
      <Field id="email" label={t.auth.email} type="email" inputMode="email" autoComplete="email" defaultValue={v.email} error={e.email} />
      <Field id="password" label={t.auth.password} hint={t.auth.passwordHint} type="password" autoComplete="new-password" minLength={12} error={e.password} />
      <fieldset aria-describedby={e.accept ? "accept-msg" : undefined}>
        <legend className="sr-only">{s.mustAccept}</legend>
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>{s.termsPrefix} <Link href="/conditions" target="_blank">{s.termsLink}</Link></span>
        </label>
        <label className="check">
          <input type="checkbox" name="confidentiality" required />
          <span>{s.confidentialityPrefix}<Link href="/confidentialite" target="_blank">{s.confidentialityLink}</Link></span>
        </label>
        {e.accept && <p id="accept-msg" className="bs-field-msg bs-field-error">{e.accept}</p>}
      </fieldset>
      <SubmitButton>{s.submit}</SubmitButton>
    </form>
  );
}
