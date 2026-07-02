import Image from "next/image";
import { AuthScene } from "./AuthScene";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Accedi · TESTÀRE CRM" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-white">
      <AuthScene />

      {/* Card in vetro */}
      <div className="relative z-10 w-full max-w-[400px]">
        {/* Marchio */}
        <div className="auth-in auth-d1 mb-7 flex flex-col items-center text-center">
          <Image src="/logos/testare-logo.png" alt="TESTÀRE" width={190} height={48} className="h-12 w-auto brightness-0 invert" priority />
          <div className="mt-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/45">
            <span className="h-px w-6 bg-white/25" /> Performance CRM <span className="h-px w-6 bg-white/25" />
          </div>
        </div>

        <div
          className="auth-in auth-d2 rounded-[22px] border border-white/12 p-7 backdrop-blur-xl"
          style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))", boxShadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)" }}
        >
          <div className="auth-in auth-d3 mb-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e94f35] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e94f35]" />
              </span>
              Area riservata
            </div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">Bentornato</h1>
            <p className="mt-1 text-[13px] text-white/50">Accedi al centro di controllo. L&apos;accesso è solo su invito.</p>
          </div>

          <LoginForm next={safeNext} />
        </div>

        <p className="auth-in auth-d6 mt-6 text-center text-[11px] text-white/35">
          Problemi di accesso? Contatta l&apos;amministratore TESTÀRE.
        </p>
      </div>
    </div>
  );
}
