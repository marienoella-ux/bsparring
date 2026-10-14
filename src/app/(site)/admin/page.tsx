import { Card } from "@/components/Card";
import { t } from "@/i18n";

export default function Page() {
  return (
    <div className="stack-lg">
      <div className="stack">
        <h1 className="text-h1">{t.admin.title}</h1>
        <p className="muted">{t.admin.homeLead}</p>
      </div>
      <Card title={t.admin.queueTitle}>
        <p className="muted">{t.admin.queueEmpty}</p>
      </Card>
    </div>
  );
}
