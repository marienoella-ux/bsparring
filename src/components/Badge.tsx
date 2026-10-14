export type BadgeTone = "neutral" | "foret" | "cuivre" | "success" | "warning" | "danger" | "info";

// Le mot porte toujours le sens : la couleur ne fait que le renforcer.
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={tone === "neutral" ? "bs-badge" : `bs-badge bs-badge-${tone}`}>{children}</span>;
}
