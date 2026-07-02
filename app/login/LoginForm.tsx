"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <label className="auth-in auth-d4 block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/45">Email</span>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="auth-inp pl-9"
            placeholder="nome@societa.it"
          />
        </div>
      </label>

      <label className="auth-in auth-d5 block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/45">Password</span>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="auth-inp pl-9"
            placeholder="••••••••"
          />
        </div>
      </label>

      {state?.error && (
        <p className="flex items-center gap-2 rounded-lg border border-[#e94f35]/30 bg-[#e94f35]/10 px-3 py-2 text-[13px] font-medium text-[#ffb3a5]" role="alert">
          <WarnIcon className="h-4 w-4 shrink-0" /> {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="auth-btn auth-in auth-d5 flex items-center justify-center gap-2">
        {pending ? (
          <>
            <SpinnerIcon className="auth-spin h-4 w-4" /> Verifica in corso…
          </>
        ) : (
          <>
            Entra <ArrowIcon className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

/* --- Icone inline (nessuna dipendenza) --- */
function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
    </svg>
  );
}
function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function ArrowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function SpinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function WarnIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
