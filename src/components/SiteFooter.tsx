import Link from "next/link";
import { t } from "@/i18n";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="site-footer bs-on-nuit">
      <div className="site-footer-inner">
        <Logo size={32} accent={false} />
        <nav aria-label="Informations légales" className="row">
          <Link href="/conditions">{t.footer.legal}</Link>
          <Link href="/confidentialite">{t.footer.privacy}</Link>
        </nav>
        <p className="text-caption">© {new Date().getFullYear()} {t.footer.copyright}</p>
      </div>
    </footer>
  );
}
