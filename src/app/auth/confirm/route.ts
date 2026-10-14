import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

// Point d'arrivée des liens envoyés par email (confirmation, invitation, réinitialisation).
// Deux formes possibles : ?token_hash=…&type=… (gabarits B-Sparring) ou ?code=… (flux PKCE).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (ok) {
    url.pathname = next;
  } else {
    url.pathname = "/connexion";
    url.searchParams.set("erreur", "lien");
  }
  return NextResponse.redirect(url);
}
