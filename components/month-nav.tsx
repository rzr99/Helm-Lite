"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Prev / This month / Next switcher. Writes a single search param (default
// "qmonth") while preserving every other param already on the URL.
export function MonthNav({
  prev,
  next,
  param = "qmonth",
}: {
  prev: string;
  next: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const go = (value?: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(param, value);
    else params.delete(param);
    const s = params.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const btn =
    "rounded-lg border border-[var(--border-strong)] px-2.5 py-1 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => go(prev)} className={btn} aria-label="Previous month">
        ←
      </button>
      <button type="button" onClick={() => go()} className={btn}>
        This month
      </button>
      <button type="button" onClick={() => go(next)} className={btn} aria-label="Next month">
        →
      </button>
    </div>
  );
}
