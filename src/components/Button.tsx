import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";

export function buttonClass(variant: ButtonVariant = "primary", opts: { block?: boolean; small?: boolean } = {}) {
  return ["bs-btn", `bs-btn-${variant}`, opts.block && "bs-btn-block", opts.small && "bs-btn-sm"]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; block?: boolean; small?: boolean };

export function Button({ variant = "primary", block, small, className, ...rest }: ButtonProps) {
  return <button className={[buttonClass(variant, { block, small }), className].filter(Boolean).join(" ")} {...rest} />;
}

type LinkProps = { href: string; children: ReactNode; variant?: ButtonVariant; block?: boolean; small?: boolean };

export function ButtonLink({ href, children, variant = "primary", block, small }: LinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, { block, small })} style={{ textDecoration: variant === "quiet" ? undefined : "none" }}>
      {children}
    </Link>
  );
}
