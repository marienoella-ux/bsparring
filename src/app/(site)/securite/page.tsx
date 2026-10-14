import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { t } from "@/i18n";
import { homePathFor } from "@/lib/auth/rules";
import { requireUser } from "@/lib/auth/session";
import { TotpForm } from "./TotpForm";

export const metadata: Metadata = { title: t.mfa.title };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase, roles } = await requireUser();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect(homePathFor(roles));

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((f) => f.status === "verified");

  if (verified) {
    return (
      <div className="page narrow stack-lg">
        <div className="stack">
          <h1 className="text-h1">{t.mfa.title}</h1>
          <p className="muted">{t.mfa.verifyLead}</p>
        </div>
        <TotpForm factorId={verified.id} />
      </div>
    );
  }

  // Pas de facteur vérifié : on retire les enrôlements inachevés, puis on en crée un nouveau.
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data: enrolled, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `B-Sparring ${new Date().toISOString().slice(0, 16)}`,
    issuer: t.brand.name,
  });
  if (error || !enrolled) {
    return (
      <div className="page narrow stack">
        <h1 className="text-h1">{t.mfa.title}</h1>
        <p className="alert alert-danger" role="alert">{t.auth.genericError}</p>
      </div>
    );
  }

  return (
    <div className="page narrow stack-lg">
      <div className="stack">
        <h1 className="text-h1">{t.mfa.title}</h1>
        <p>{t.mfa.requiredLead}</p>
      </div>
      <ol className="stack" style={{ paddingLeft: "var(--space-6)", margin: 0 }}>
        <li>{t.mfa.enrollStep1}</li>
        <li className="stack">
          <span>{t.mfa.enrollStep2}</span>
          <div className="qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolled.totp.qr_code} alt={t.mfa.enrollStep2} width={176} height={176} />
          </div>
          <span className="text-caption muted">{t.mfa.enrollManual}</span>
          <code className="secret">{enrolled.totp.secret}</code>
        </li>
        <li>{t.mfa.enrollStep3}</li>
      </ol>
      <TotpForm factorId={enrolled.id} />
    </div>
  );
}
