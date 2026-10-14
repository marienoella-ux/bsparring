import { NextResponse, type NextRequest } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

const UNAVAILABLE_PATH = "/indisponible";

// Page « Service indisponible » (503) au lieu d'une erreur 500 : configuration
// incomplète ou Supabase injoignable. Le détail ne va que dans les journaux du serveur.
function unavailable(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = UNAVAILABLE_PATH;
  url.search = "";
  return NextResponse.rewrite(url, { status: 503 });
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === UNAVAILABLE_PATH) return NextResponse.next();

  const missing = missingSupabaseEnv();
  if (missing.length > 0) {
    console.error(`[B-Sparring] Variables d'environnement manquantes : ${missing.join(", ")}`);
    return unavailable(request);
  }

  try {
    return await updateSession(request);
  } catch (error) {
    console.error("[B-Sparring] Échec de la vérification de session", error);
    return unavailable(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
