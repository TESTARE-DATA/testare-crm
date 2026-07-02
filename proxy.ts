import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ============================================================================
// Proxy (in Next 16 sostituisce "middleware"): gira prima di ogni pagina.
// 1) rinfresca la sessione Supabase (aggiorna i cookie di auth);
// 2) blocca l'accesso: chi non è loggato viene mandato a /login;
// 3) instrada per RUOLO (letto da app_metadata, impostato solo lato server):
//    - staff    → confinato alla propria società (/clienti/<suo-club>);
//    - athlete  → confinato alla propria Vista Atleta;
//    - superadmin → nessun confine.
// È la prima linea di difesa (ottimistica); il controllo autorevole sta nella
// DAL (lib/auth/session.ts) e nelle server action, vicino ai dati.
// ============================================================================

// Rotte raggiungibili SENZA login.
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

/** Home di destinazione per ruolo (dopo il login o su percorso non consentito). */
function homeFor(role: string | undefined, clientId: string | null, athleteHome: string): string {
  if (role === "staff" && clientId) return `/clienti/${clientId}`;
  if (role === "athlete" && clientId) return athleteHome;
  return "/";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Se Supabase non è configurato non blocchiamo il sito (dev senza env).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANTE: getUser() valida il token col server (non fidarsi del solo cookie).
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string) => {
    const to = request.nextUrl.clone();
    to.pathname = pathname;
    to.search = "";
    return NextResponse.redirect(to);
  };

  if (!user && !isPublic(path)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  if (user) {
    const meta = (user.app_metadata ?? {}) as { role?: string; client_id?: string | null; athlete_id?: string | null };
    const role = meta.role;
    const clientId = meta.client_id ?? null;
    const athleteHome = clientId ? `/clienti/${clientId}/vista-atleta` : "/login";
    const home = homeFor(role, clientId, athleteHome);

    // Già loggato sulla pagina di login → vai alla tua home.
    if (path === "/login") return redirectTo(home);

    // Staff: può muoversi solo dentro la propria società.
    if (role === "staff" && clientId) {
      const m = path.match(/^\/clienti\/([^/]+)/);
      const otherClient = m && m[1] !== clientId;
      if (otherClient || path === "/" || path.startsWith("/admin")) return redirectTo(home);
    }

    // Atleta: può vedere solo la propria Vista Atleta.
    if (role === "athlete") {
      if (!clientId) return redirectTo("/login");
      if (path !== athleteHome) return redirectTo(athleteHome);
    }

    // Ruolo assente/sconosciuto (account non provisionato): fuori.
    if (role !== "superadmin" && role !== "staff" && role !== "athlete") {
      await supabase.auth.signOut();
      return redirectTo("/login");
    }
  }

  return response;
}

export const config = {
  // Gira su tutto tranne asset statici, ottimizzatore immagini e /api
  // (l'health check resta pubblico; le API con dati fanno i propri controlli).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
