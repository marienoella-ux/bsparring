import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backOfficeGate, homePathFor, type Role } from "./rules";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, roles: [] as Role[] };

  // Lecture soumise aux règles de la base : on ne voit que ses propres rôles.
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r) => r.role as Role);
  return { supabase, user, roles };
}

export async function requireUser() {
  const session = await getSession();
  if (!session.user) redirect("/connexion");
  return { ...session, user: session.user };
}

export async function requireRole(role: Role) {
  const session = await requireUser();
  if (!session.roles.includes(role)) redirect(homePathFor(session.roles));
  return session;
}

// Back-office : rôle admin ou facilitateur ET double authentification.
// La base applique la même règle : sans 2FA, ces comptes ne lisent rien.
export async function requireBackOffice() {
  const session = await requireUser();
  const { data } = await session.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const gate = backOfficeGate(session.roles, data?.currentLevel ?? null, data?.nextLevel ?? null);
  if (gate === "forbidden") redirect(homePathFor(session.roles));
  if (gate !== "ok") redirect("/securite");
  return session;
}

export async function requireAdmin() {
  const session = await requireBackOffice();
  if (!session.roles.includes("admin")) redirect("/admin");
  return session;
}
