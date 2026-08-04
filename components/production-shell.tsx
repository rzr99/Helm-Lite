import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/profile";
import { Avatar } from "@/components/ui";
import { ProductionNav } from "@/components/production-nav";

// The dedicated Production workspace chrome — its own rail, brand, and nav, so
// entering /production feels like stepping into a separate app (while staying
// inside Helm). Provided by app/production/layout.tsx around every page.

function ProdMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-600/40 bg-amber-600/10">
      <span className="h-3 w-3 rotate-45 bg-amber-600" />
    </span>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <ProdMark />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight text-[#f8f7f4]">
          Playbook
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/80">
          Linear Solutions
        </p>
      </div>
    </div>
  );
}

function BackToHelm() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#f8f7f4]/55 transition-colors hover:bg-white/[0.05] hover:text-[#f8f7f4]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back to Helm
    </Link>
  );
}

export function ProductionShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen font-sans lg:flex">
      {/* Rail (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-amber-600/[0.14] bg-[#0c0b0a] px-3 py-6 lg:flex">
        <Brand />
        <ProductionNav variant="rail" />
        <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.06] px-1 pt-4">
          <BackToHelm />
          <div className="flex items-center justify-between gap-2 px-2 pt-1">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={profile.full_name} src={profile.avatar_url} size={7} />
              <span className="truncate text-xs text-[#f8f7f4]/60">
                {profile.full_name}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-[#f8f7f4]/45 transition-colors hover:text-[#f8f7f4]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-amber-600/[0.14] bg-[#0c0b0a] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Brand />
            <Link
              href="/"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-[#f8f7f4]/70"
            >
              ← Helm
            </Link>
          </div>
          <ProductionNav variant="bar" />
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Page header used inside the Production workspace (the shell provides the
// surrounding chrome, each page provides its own title + action).
export function ProdHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 animate-fade-up">
      {back && (
        <Link
          href={back.href}
          className="w-fit text-sm text-[#f8f7f4]/50 transition-colors hover:text-[#f8f7f4]"
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-zinc-50">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
