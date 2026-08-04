"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/production/playbook", label: "Playbook" },
  { href: "/production/kit", label: "Kit" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function ProductionNav({ variant = "rail" }: { variant?: "rail" | "bar" }) {
  const pathname = usePathname();

  if (variant === "bar") {
    return (
      <nav className="flex gap-1 overflow-x-auto">
        {NAV.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "text-[var(--text)]/60 hover:bg-[var(--hover)] hover:text-[var(--text)]")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
              (active
                ? "bg-[var(--hover)] font-medium text-[var(--text)]"
                : "text-[var(--text)]/50 hover:bg-[var(--sunken)] hover:text-[var(--text)]")
            }
          >
            <span
              className={
                "h-2 w-2 rotate-45 transition-colors " +
                (active
                  ? "bg-amber-600"
                  : "border border-[var(--text)]/30 group-hover:border-[var(--text)]/60")
              }
            />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
