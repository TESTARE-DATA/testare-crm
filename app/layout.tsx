import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getProfile } from "@/lib/auth/session";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "TESTÀRE CRM",
  description: "Piattaforma di gestione e performance analysis per società sportive — TESTÀRE",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Profilo dell'utente loggato (null sulla pagina di login): guida la sidebar.
  const profile = await getProfile();
  return (
    <html lang="it" className={`${inter.variable} antialiased`}>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar profile={profile} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
