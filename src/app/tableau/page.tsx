import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/rules";
import { requireUser } from "@/lib/auth/session";

// Aiguillage après connexion selon les rôles du compte.
export default async function Page() {
  const { roles } = await requireUser();
  redirect(homePathFor(roles));
}
