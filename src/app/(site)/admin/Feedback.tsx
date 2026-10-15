import { t } from "@/i18n";

// Message de retour des actions du back-office (?ok=… ou ?erreur=code).
export function Feedback({ ok, erreur, messages }: { ok?: string; erreur?: string; messages: Record<string, string> }) {
  if (ok && messages[ok]) return <p className="alert alert-success" role="status">{messages[ok]}</p>;
  if (erreur) {
    const errors = t.admin.errors as Record<string, string>;
    const text = errors[erreur] ?? (erreur === "valeur" ? t.admin.invalidValue : t.auth.genericError);
    return <p className="alert alert-danger" role="alert">{text}</p>;
  }
  return null;
}
