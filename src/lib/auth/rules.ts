// Règles d'accès pures (sans dépendance), testées dans rules.test.ts.

export type Role = "dirigeant" | "expert" | "facilitateur" | "admin";
export type AssuranceLevel = string | null;

export const BACK_OFFICE_ROLES: Role[] = ["admin", "facilitateur"];

export function hasBackOfficeRole(roles: Role[]): boolean {
  return roles.some((r) => BACK_OFFICE_ROLES.includes(r));
}

// Page d'accueil après connexion, selon les rôles du compte.
export function homePathFor(roles: Role[]): string {
  if (hasBackOfficeRole(roles)) return "/admin";
  if (roles.includes("expert")) return "/expert";
  return "/espace";
}

export type BackOfficeGate = "ok" | "forbidden" | "enroll" | "verify";

// Accès au back-office : rôle admin ou facilitateur ET session en 2FA.
// - nextLevel « aal1 » : aucun facteur TOTP enregistré → l'enrôler.
// - nextLevel « aal2 » mais currentLevel « aal1 » : facteur enregistré, code à saisir.
export function backOfficeGate(
  roles: Role[],
  currentLevel: AssuranceLevel,
  nextLevel: AssuranceLevel,
): BackOfficeGate {
  if (!hasBackOfficeRole(roles)) return "forbidden";
  if (currentLevel === "aal2") return "ok";
  if (nextLevel === "aal2") return "verify";
  return "enroll";
}

// N'accepte que des chemins internes, pour éviter les redirections ouvertes.
export function safeNextPath(next: string | null | undefined, fallback = "/tableau"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
