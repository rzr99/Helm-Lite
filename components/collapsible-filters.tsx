"use client";

import { useState } from "react";

// A compact "Filters" button that hides the dashboard's filter controls until
// wanted — so the default Overview reads at a glance. Opens automatically when
// a filter is already applied (so you can see what's active).
export function CollapsibleFilters({
  defaultOpen,
  active,
  children,
}: {
  defaultOpen: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3.5 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters
        {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}
