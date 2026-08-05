"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { key: string; href: string; label: string; icon: React.ReactNode };

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-strong)] bg-[#0b0b0a]">
      <span className="h-[9px] w-[9px] rotate-45 bg-amber-600" />
    </span>
  );
}

export function MobileNav({
  items,
  active,
  fullName,
  avatarUrl,
  role,
}: {
  items: Item[];
  active: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col gap-6 border-r border-[var(--border)] bg-[var(--surface-2)] px-3 py-5">
            <div className="flex items-center justify-between px-2">
              <span className="flex items-center gap-2.5">
                <Logo />
                <span className="leading-tight">
                  <span className="block text-[14px] font-semibold tracking-tight text-[var(--text)]">
                    Helm
                  </span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                    Linear Solutions
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-0.5">
              {items.map((l) => {
                const isActive = l.key === active;
                return (
                  <Link
                    key={l.key}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors " +
                      (isActive
                        ? "bg-[var(--hover)] font-medium text-[var(--text)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]")
                    }
                  >
                    <span
                      className={
                        "h-2 w-2 rotate-45 transition-colors " +
                        (isActive
                          ? "bg-amber-600"
                          : "border border-[var(--text-faint)] group-hover:border-[var(--text-muted)]")
                      }
                    />
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border-soft)] px-1 pt-4">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--hover)]"
              >
                <Avatar name={fullName} src={avatarUrl} size={9} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {fullName}
                  </p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-600">
                    {roleLabel[role] ?? role}
                  </span>
                </div>
              </Link>
              <ThemeToggle />
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
