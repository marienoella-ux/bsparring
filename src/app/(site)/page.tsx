import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { t } from "@/i18n";

export default function Landing() {
  const l = t.landing;
  return (
    <>
      <section className="hero bs-on-nuit">
        <div className="hero-inner">
          <p className="text-overline">{l.overline}</p>
          <h1 className="text-display">{l.title}</h1>
          <p className="text-body-lg">{l.lead}</p>
          <div className="row">
            <ButtonLink href="/inscription">{l.cta}</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="fonctionnement">
        <div className="section-inner">
          <h2 id="fonctionnement" className="text-h1">{l.howTitle}</h2>
          <ol className="steps">
            {l.steps.map((step, i) => (
              <li key={step.title}>
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <div className="stack" style={{ gap: "var(--space-2)" }}>
                  <h3 className="text-h2">{step.title}</h3>
                  <p className="muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="domaines">
        <div className="section-inner">
          <h2 id="domaines" className="text-h1">{l.domainsTitle}</h2>
          <div className="grid-2">
            {l.domains.map((d) => (
              <Card key={d.title} title={d.title} headingLevel="h3">
                <p>{d.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="confidentialite">
        <div className="section-inner" style={{ maxWidth: 720 }}>
          <Card trust overline={l.trustOverline}>
            <h2 id="confidentialite" className="bs-card-title">{l.trustTitle}</h2>
            <ul className="stack" style={{ margin: "var(--space-4) 0 0", paddingLeft: "var(--space-6)" }}>
              {l.trustPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
          <div className="stack" style={{ justifyItems: "start" }}>
            <ButtonLink href="/inscription">{l.cta}</ButtonLink>
            <p className="text-caption muted">{l.pricesNote}</p>
          </div>
        </div>
      </section>
    </>
  );
}
