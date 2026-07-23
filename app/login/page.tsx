"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { startSession } from "@/app/actions";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#141412] px-3.5 py-2.5 text-sm text-[#f8f7f4] outline-none transition-colors placeholder:text-[#f8f7f4]/35 focus:border-amber-600/70 focus:ring-2 focus:ring-amber-600/20";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("deactivated")) {
      setError("Your account is inactive. Ask the owner to reactivate it.");
    } else if (params.has("expired")) {
      setError("Your session ended for the day — please sign in again.");
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Wrong email or password — try again.");
      setLoading(false);
      return;
    }

    // Stamp the login time so the daily-expiry check in the proxy has a start.
    await startSession();

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 font-sans">
      {/* Corner-bracket frame (structural element E1) */}
      <span className="pointer-events-none absolute left-5 top-5 h-4 w-4 border-l border-t border-[#f8f7f4]/25" />
      <span className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-[#f8f7f4]/25" />
      <span className="pointer-events-none absolute bottom-5 left-5 h-4 w-4 border-b border-l border-[#f8f7f4]/25" />
      <span className="pointer-events-none absolute bottom-5 right-5 h-4 w-4 border-b border-r border-[#f8f7f4]/25" />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="mb-7">
          <div className="mb-5 flex items-center gap-2.5">
            <svg viewBox="0 0 400 400" className="h-9 w-9 rounded-lg border border-white/10" aria-hidden>
              <rect width="400" height="400" fill="#0E0E0D" />
              <g fill="#F8F7F4">
                <rect x="96" y="96" width="62" height="13" />
                <rect x="96" y="96" width="13" height="62" />
                <rect x="242" y="96" width="62" height="13" />
                <rect x="291" y="96" width="13" height="62" />
                <rect x="96" y="291" width="62" height="13" />
                <rect x="96" y="242" width="13" height="62" />
                <rect x="242" y="291" width="62" height="13" />
                <rect x="291" y="242" width="13" height="62" />
              </g>
              <polygon points="200,146 254,200 200,254 146,200" fill="#E87000" />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight text-[#f8f7f4]">
              Helm Lite
            </span>
          </div>

          <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#f8f7f4]/40">
            <span className="h-1.5 w-1.5 rotate-45 border border-[#f8f7f4]/40" />
            00 — Linear.Solutions
          </p>

          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-[#f8f7f4]">
            Sign in to the <span className="text-amber-600">floor</span>.
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#141412]/80 p-6 backdrop-blur-sm"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#f8f7f4]/70">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#f8f7f4]/70">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg bg-amber-600 py-2.5 font-medium text-[#0e0e0d] transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
