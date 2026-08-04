"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked — user can still select the text */
        }
      }}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-[#f8f7f4] transition-colors hover:bg-white/[0.06]"
      }
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
