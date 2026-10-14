import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

// Client « service role » : contourne les règles de sécurité de la base.
// À n'utiliser que pour les opérations d'authentification réservées au serveur
// (inviter un utilisateur), après avoir vérifié les droits de l'appelant.
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
