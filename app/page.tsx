import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

const roleInfo: Record<string, { label: string; description: string }> = {
  owner: {
    label: "Owner",
    description:
      "Full access: all modules, all agents, expenses, personas and accounts.",
  },
  team_lead: {
    label: "Team Lead",
    description:
      "Sales floor visibility: all agents' CRM activity, daily activity, sales and revenue. No expenses, no personas.",
  },
  agent: {
    label: "Agent",
    description: "Your own leads, follow-ups, activity and closes only.",
  },
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, active")
    .eq("id", user.id)
    .single();

  const info = profile ? roleInfo[profile.role] : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Helm Lite
        </h1>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">Signed in as</p>
        <p className="mb-4 text-lg font-medium text-black dark:text-zinc-50">
          {profile?.full_name || user.email}
        </p>

        {info && (
          <>
            <span className="mb-2 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-900 dark:bg-green-900 dark:text-green-100">
              {info.label}
            </span>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              {info.description}
            </p>
          </>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Gate 1: auth + roles + row-level security
      </p>
    </div>
  );
}
