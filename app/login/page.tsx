"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const inputClass =
  "w-full rounded-xl border border-[#2a2a37] bg-[#101017] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("deactivated")) {
      setError("Your account is inactive. Ask the owner to reactivate it.");
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

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080b] p-6 font-sans">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <svg viewBox="0 0 400 400" className="h-14 w-14 rounded-xl border border-white/10" aria-hidden>
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
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
              Helm Lite
            </h1>
            <p className="text-sm text-zinc-400">Sign in to your workspace</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-[#232331] bg-[#131319] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
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
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
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
            <p className="rounded-xl border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl bg-violet-600 py-2.5 font-semibold text-white shadow-[0_1px_3px_rgba(124,58,237,0.45)] transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
