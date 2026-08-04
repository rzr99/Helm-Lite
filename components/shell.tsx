import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/profile";
import { Avatar } from "@/components/ui";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

const roleBadge: Record<string, string> = {
  owner: "bg-violet-500/15 text-violet-300",
  team_lead: "bg-sky-500/15 text-sky-300",
  agent: "bg-teal-500/15 text-teal-300",
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

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h6M8 17h6" />
    </svg>
  );
}

function ProductionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18" />
      <path d="m6 5-1 5M11 5l-1 5M16 5l-1 5" />
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

function ExpensesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}

function HiringIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 12v3" />
    </svg>
  );
}

function FreelancersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 20 6v12.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5z" />
      <path d="m3 8.5 4-.7M9 7.6l4-.7M15 6.7l4-.7" />
    </svg>
  );
}

function TrainingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M9 8h7" />
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
  { key: "projects", href: "/projects", label: "Production", icon: <ProjectsIcon /> },
  { key: "production", href: "/production", label: "Playbook", icon: <ProductionIcon />, ownerOnly: true },
  { key: "freelancers", href: "/freelancers", label: "Freelancers", icon: <FreelancersIcon />, ownerOnly: true },
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
  {
    key: "expenses",
    href: "/expenses",
    label: "Expenses",
    icon: <ExpensesIcon />,
    ownerOnly: true,
  },
  {
    key: "hiring",
    href: "/hiring",
    label: "Hiring",
    icon: <HiringIcon />,
    ownerOnly: true,
  },
  {
    key: "training",
    href: "/training",
    label: "Training",
    icon: <TrainingIcon />,
  },
  {
    key: "team",
    href: "/team",
    label: "Team",
    icon: <LeadsIcon />,
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
    <nav className="flex flex-col gap-0.5">
      {visibleLinks(role).map((l) => {
        const isActive = l.key === active;
        return (
          <Link
            key={l.key}
            href={l.href}
            className={
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
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
  );
}

function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className + " rounded-lg border border-white/10"}
      aria-hidden
    >
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
  );
}

const pageEyebrow: Record<string, string> = {
  dashboard: "Overview",
  leads: "Pipeline",
  sales: "Revenue",
  projects: "Intake · handoff",
  production: "Owner · playbook",
  freelancers: "Owner · production people",
  activity: "Derived · not typed",
  personas: "Owner · identities",
  expenses: "Owner · finances",
  hiring: "Owner · recruiting",
  training: "Playbook",
  team: "People",
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3">
      <BrandMark className="h-8 w-8" />
      <span className="leading-tight">
        <span className="block text-[14px] font-semibold tracking-tight text-[var(--text)]">
          Helm Lite
        </span>
        <span className="block font-mono text-[8.5px] uppercase tracking-[0.22em] text-[var(--text-faint)]">
          Linear Solutions
        </span>
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
    <div className="min-h-screen font-sans lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-[var(--border)] bg-[var(--surface-2)] px-3 py-6 lg:flex">
        <Brand />
        <NavList active={active} role={profile.role} />
        <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border-soft)] px-1 pt-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--hover)]"
            title="Your profile — name and picture"
          >
            <Avatar name={profile.full_name} src={profile.avatar_url} size={9} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text)]">
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
      </aside>

      {/* Mobile header */}
      <div className="flex-1">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 lg:hidden">
          <Brand />
          <MobileNav
            items={visibleLinks(profile.role)}
            active={active}
            fullName={profile.full_name}
            avatarUrl={profile.avatar_url}
            role={profile.role}
          />
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
          <div key={active} className="animate-page-in">
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                {pageEyebrow[active] && (
                  <p className="mb-3 flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-[var(--text-faint)]">
                    <span className="h-1.5 w-1.5 rotate-45 bg-amber-600" />
                    {pageEyebrow[active]}
                  </p>
                )}
                <h1 className="text-[29px] font-semibold tracking-tight text-[var(--text)]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
                )}
              </div>
              {action}
            </header>
            <div className="flex flex-col gap-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
