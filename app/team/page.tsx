import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Avatar, inputClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { updateTeammate } from "@/app/team/actions";

export const dynamic = "force-dynamic";

const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "team_lead", label: "Team Lead" },
  { value: "owner", label: "Owner" },
];

export default async function TeamPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data } = await supabase
    .from("users")
    .select("id, full_name, role, active, avatar_url")
    .order("full_name");

  const users = data ?? [];

  return (
    <Shell
      profile={profile}
      active="team"
      title="Team"
      subtitle="Owner-only. Name your people, assign roles, and deactivate leavers."
    >
      <Card
        title="How to add a new login"
        description="Creating the actual email + password happens in Supabase (your master dashboard), so the app never touches passwords."
      >
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            Open{" "}
            <a
              href="https://supabase.com/dashboard/project/msjtebtppwnyzokdwhdb/auth/users"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 underline dark:text-emerald-400"
            >
              your Supabase users page
            </a>{" "}
            (log in with your Supabase account).
          </li>
          <li>
            Click <strong>Add user → Create new user</strong>.
          </li>
          <li>
            Enter their <strong>email</strong> and a <strong>strong password</strong>{" "}
            (share it with them privately — they should change it later). Leave{" "}
            <strong>Auto confirm</strong> ticked.
          </li>
          <li>
            Come back here and refresh — they'll appear below as an{" "}
            <strong>Agent</strong>. Set their name and role, hit Save.
          </li>
        </ol>
      </Card>

      <Card
        title={`People (${users.length})`}
        description="New logins start as Agent. You can't change your own role — that keeps you from locking yourself out."
        padded={false}
      >
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {users.map((u) => {
            const isSelf = u.id === profile.id;
            const save = updateTeammate.bind(null, u.id);
            return (
              <li key={u.id} className="px-5 py-4">
                <form
                  action={save}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Avatar name={u.full_name || "?"} src={u.avatar_url} size={9} />
                  <input
                    name="full_name"
                    required
                    defaultValue={u.full_name}
                    placeholder="Full name"
                    className={inputClass + " max-w-56"}
                  />
                  <select
                    name="role"
                    defaultValue={u.role}
                    disabled={isSelf}
                    className={inputClass + " max-w-36 disabled:opacity-60"}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={u.active}
                      disabled={isSelf}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Active
                  </label>
                  {isSelf && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      you
                    </span>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    Save
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        Deactivating someone locks them out of the app and hides them from
        dropdowns — reversible any time by ticking Active again. When a person
        leaves for good, also delete their login on the Supabase users page.
      </p>
    </Shell>
  );
}
