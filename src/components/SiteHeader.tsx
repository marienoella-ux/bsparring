import Link from "next/link";
import { t } from "@/i18n";
import { getSession } from "@/lib/auth/session";
import { homePathFor } from "@/lib/auth/rules";
import { buttonClass } from "./Button";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const { user, roles } = await getSession();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" aria-label={`${t.brand.full} — ${t.nav.home}`} style={{ textDecoration: "none" }}>
          <Logo size={32} />
        </Link>
        <nav aria-label="Compte">
          {user ? (
            <>
              <Link className={buttonClass("secondary", { small: true })} style={{ textDecoration: "none" }} href={homePathFor(roles)}>
                {t.nav.mySpace}
              </Link>
              <form action="/deconnexion" method="post">
                <button className={buttonClass("quiet", { small: true })} type="submit">{t.nav.logout}</button>
              </form>
            </>
          ) : (
            <Link className={buttonClass("quiet", { small: true })} href="/connexion">{t.nav.login}</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
