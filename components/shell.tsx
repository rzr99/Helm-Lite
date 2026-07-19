import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/profile";
import { Avatar } from "@/components/ui";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

const roleBadge: Record<string, string> = {
  owner:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  team_lead: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  agent:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16.5 11.5c1.8.2 3.7 1.6 4.5 4" />
      <circle cx="16.5" cy="7" r="2.5" />
    </svg>
  );
}

function SalesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M6 21V12" />
      <path d="M11 21V7" />
      <path d="M16 21v-6" />
      <path d="M21 21V4" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function PersonasIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2.5" />
      <path d="M5.5 17c.6-1.8 1.9-2.8 3.5-2.8s2.9 1 3.5 2.8" />
      <path d="M15 9h4" />
      <path d="M15 13h4" />
    </svg>
  );
}

type NavLink = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  floorOnly?: boolean;
  ownerOnly?: boolean;
};

const navLinks: NavLink[] = [
  { key: "dashboard", href: "/", label: "Dashboard", icon: <HomeIcon /> },
  { key: "leads", href: "/leads", label: "Leads", icon: <LeadsIcon /> },
  { key: "sales", href: "/sales", label: "Sales", icon: <SalesIcon /> },
  {
    key: "activity",
    href: "/activity",
    label: "Activity",
    icon: <ActivityIcon />,
    floorOnly: true,
  },
  {
    key: "personas",
    href: "/personas",
    label: "Personas",
    icon: <PersonasIcon />,
    ownerOnly: true,
  },
];

function visibleLinks(role: string) {
  return navLinks.filter((l) => {
    if (l.ownerOnly && role !== "owner") return false;
    if (l.floorOnly && role === "agent") return false;
    return true;
  });
}

function NavList({ active, role }: { active: string; role: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {visibleLinks(role).map((l) => {
        const isActive = l.key === active;
        return (
          <Link
            key={l.key}
            href={l.href}
            className={
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
              (isActive
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100")
            }
          >
            {l.icon}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
        H
      </span>
      <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Helm Lite
      </span>
    </Link>
  );
}

export function Shell({
  profile,
  active,
  title,
  subtitle,
  action,
  children,
}: {
  profile: Profile;
  active: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-zinc-200 bg-white px-3 py-6 dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <Brand />
        <NavList active={active} role={profile.role} />
        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 px-1 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={profile.full_name} size={9} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {profile.full_name}
              </p>
              <span
                className={
                  "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                  (roleBadge[profile.role] ?? "")
                }
              >
                {roleLabel[profile.role]}
              </span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            {visibleLinks(profile.role).map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium " +
                  (l.key === active
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "text-zinc-600 dark:text-zinc-400")
                }
              >
                {l.label}
              </Link>
            ))}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {subtitle}
                </p>
              )}
            </div>
            {action}
          </header>
          <div className="flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
