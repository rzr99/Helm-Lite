"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/ui";

type Item = { key: string; href: string; label: string; icon: React.ReactNode };

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

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
        className="rounded-lg p-2 text-zinc-300 hover:bg-[#16161e] hover:text-white"
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
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col gap-5 border-r border-[#1b1b24] bg-[#0c0c12] px-3 py-5 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white">
                  H
                </span>
                <span className="text-lg font-bold tracking-tight text-zinc-50">
                  Helm Lite
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-zinc-400 hover:bg-[#16161e] hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {items.map((l) => {
                const isActive = l.key === active;
                return (
                  <Link
                    key={l.key}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                      (isActive
                        ? "bg-[#1b1626] text-violet-200 ring-1 ring-inset ring-violet-500/25"
                        : "text-zinc-400 hover:bg-[#16161e] hover:text-zinc-100")
                    }
                  >
                    {l.icon}
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[#1b1b24] px-1 pt-4">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#16161e]"
              >
                <Avatar name={fullName} src={avatarUrl} size={9} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-50">
                    {fullName}
                  </p>
                  <span className="text-xs text-zinc-500">
                    {roleLabel[role] ?? role}
                  </span>
                </div>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[#2a2a37] px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#1e1e28] hover:text-white"
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
