import type { ReactNode } from "react";

type Props = {
  overline?: string;
  title?: string;
  meta?: string;
  footer?: ReactNode;
  trust?: boolean;
  children?: ReactNode;
  headingLevel?: "h2" | "h3";
};

export function Card({ overline, title, meta, footer, trust, children, headingLevel = "h2" }: Props) {
  const Heading = headingLevel;
  return (
    <section className={trust ? "bs-card bs-card-trust" : "bs-card"}>
      {overline && <p className="bs-card-overline">{overline}</p>}
      {title && <Heading className="bs-card-title">{title}</Heading>}
      {meta && <p className="bs-card-meta">{meta}</p>}
      {children && <div className="bs-card-body">{children}</div>}
      {footer && <div className="bs-card-footer">{footer}</div>}
    </section>
  );
}
