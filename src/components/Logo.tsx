import { t } from "@/i18n";

type Props = { size?: number; markOnly?: boolean; accent?: boolean };

// Deux cercles (deux regards sur une décision) et la lentille cuivre (le point où elle se tranche).
export function LogoMark({ size = 40, accent = true }: { size?: number; accent?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="18" cy="24" r="12" />
        <circle cx="30" cy="24" r="12" />
      </g>
      <path
        className={accent ? "bs-logo-lens" : undefined}
        fill={accent ? undefined : "currentColor"}
        d="M24 13.61A12 12 0 0 1 24 34.39A12 12 0 0 1 24 13.61Z"
      />
    </svg>
  );
}

export function Logo({ size = 40, markOnly = false, accent = true }: Props) {
  if (markOnly) {
    return (
      <span className="bs-logo" role="img" aria-label={t.brand.full}>
        <LogoMark size={size} accent={accent} />
      </span>
    );
  }
  return (
    <span className="bs-logo" style={{ fontSize: size * 0.6 }} aria-label={t.brand.full} role="img">
      <LogoMark size={size} accent={accent} />
      <span className="bs-logo-words" aria-hidden="true">
        <span className="bs-logo-name">{t.brand.name}</span>
        <span className="bs-logo-by">{t.brand.by}</span>
      </span>
    </span>
  );
}
