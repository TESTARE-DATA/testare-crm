import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // I loghi delle società possono essere SVG (es. Empoli).
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    // Stemmi delle squadre dal provider dati campionato (football-data.org).
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
