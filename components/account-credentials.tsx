"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";

type Defaults = {
  platform?: string;
  handle?: string;
  login_email?: string | null;
  login_password?: string | null;
};

// Identity + login credentials for an account. The password field is shown for
// every platform EXCEPT X — X is our most-worked account, so its password is
// kept separate and never stored here. Platform is tracked in state so the
// password field can appear/disappear as the platform changes.
export function AccountCredentials({
  platforms,
  defaults,
}: {
  platforms: string[];
  defaults?: Defaults;
}) {
  const [platform, setPlatform] = useState(
    defaults?.platform ?? platforms[0] ?? "x"
  );
  const [showPw, setShowPw] = useState(false);
  const isX = platform.trim().toLowerCase() === "x";

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Platform <span className="text-red-500">*</span>
          </label>
          <select
            name="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={inputClass}
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Missing a platform? Add it on the Personas page first.
          </p>
        </div>
        <div>
          <label className={labelClass}>
            Handle <span className="text-red-500">*</span>
          </label>
          <input
            name="handle"
            required
            defaultValue={defaults?.handle ?? ""}
            placeholder="@persona_handle"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Login email</label>
          <input
            type="email"
            name="login_email"
            defaultValue={defaults?.login_email ?? ""}
            placeholder="account@gmail.com"
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Password</label>
          {isX ? (
            <div className="flex h-[42px] items-center rounded-lg border border-dashed border-[var(--border-strong)] px-3 text-sm text-[var(--text-faint)]">
              Kept separate for X — not stored here.
            </div>
          ) : (
            <>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="login_password"
                  defaultValue={defaults?.login_password ?? ""}
                  placeholder="account password"
                  autoComplete="new-password"
                  className={inputClass + " pr-16"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto h-fit rounded px-1.5 py-0.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Owner-only. Stored so the team has this login in one place.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
