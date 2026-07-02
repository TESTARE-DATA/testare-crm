import type { NextConfig } from "next";

// Header di sicurezza applicati a TUTTE le risposte. L'app tratta dati sanitari
// (categoria particolare GDPR art. 9): la difesa in profondità qui è d'obbligo.
// - frame-ancestors 'none' → niente clickjacking / embedding di terzi.
// - object-src/base-uri → riduce le superfici di injection.
// - nosniff, Referrer-Policy, Permissions-Policy → hardening standard.
// NB: la CSP NON restringe script-src per non rompere gli script inline di Next;
// verrà stretta (nonce) quando arriverà il login.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Non annunciare il framework/versione (riduce il fingerprinting).
  poweredByHeader: false,
  images: {
    // I loghi delle società possono essere SVG (es. Empoli).
    dangerouslyAllowSVG: true,
    // Gli SVG remoti vengono scaricati come allegato, mai renderizzati inline
    // nel nostro dominio (evita che un SVG di terzi giri sotto la nostra origin).
    contentDispositionType: "attachment",
    // CSP dedicata alle immagini ottimizzate: nessuno script eseguibile.
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox",
    // Stemmi delle squadre dal provider dati campionato (football-data.org).
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
