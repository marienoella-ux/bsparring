import { t } from "@/i18n";
import { ForgotForm } from "./ForgotForm";

export default function Page() {
  return (
    <div className="page narrow stack-lg">
      <div className="stack">
        <h1 className="text-h1">{t.auth.forgotTitle}</h1>
        <p className="muted">{t.auth.forgotLead}</p>
      </div>
      <ForgotForm />
    </div>
  );
}
