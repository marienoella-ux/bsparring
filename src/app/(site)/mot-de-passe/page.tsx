import { t } from "@/i18n";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm } from "./PasswordForm";

export default async function Page() {
  await requireUser();
  return (
    <div className="page narrow stack-lg">
      <h1 className="text-h1">{t.auth.setPasswordTitle}</h1>
      <PasswordForm />
    </div>
  );
}
