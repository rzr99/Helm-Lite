import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/profile";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

export function Nav({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-base font-semibold text-black dark:text-zinc-50"
          >
            Helm Lite
          </Link>
          <Link
            href="/"
            className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Dashboard
          </Link>
          <Link
            href="/leads"
            className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Leads
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            {profile.full_name}
          </span>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900 dark:bg-green-900 dark:text-green-100">
            {roleLabel[profile.role]}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
