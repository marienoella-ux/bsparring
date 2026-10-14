import { t } from "@/i18n";

export default function Page() {
  return (
    <div className="page narrow stack">
      <h1 className="text-h1">{t.signup.checkEmailTitle}</h1>
      <p>{t.signup.checkEmailText}</p>
    </div>
  );
}
