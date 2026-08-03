import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Avatar, inputClass, btnSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { updateTeammate } from "@/app/team/actions";

export const dynamic = "force-dynamic";

const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "team_lead", label: "Team Lead" },
  { value: "owner", label: "Owner" },
];

type TeamUser = {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  avatar_url: string | null;
};

function PersonRow({ u, selfId }: { u: TeamUser; selfId: string }) {
  const isSelf = u.id === selfId;
  const save = updateTeammate.bind(null, u.id);
  return (
    <li className="px-5 py-4">
      <form action={save} className="flex flex-wrap items-center gap-3">
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
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            name="active"
            defaultChecked={u.active}
            disabled={isSelf}
            className="h-4 w-4 accent-amber-600"
          />
          Active
        </label>
        {isSelf && (
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-amber-600">
            you
          </span>
        )}
        <button
          type="submit"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-[#140d05] transition-colors hover:bg-amber-500"
        >
          Save
        </button>
      </form>
    </li>
  );
}

export default async function TeamPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data } = await supabase
    .from("users")
    .select("id, full_name, role, active, avatar_url")
    .order("full_name");

  const users = data ?? [];
  const activeUsers = users.filter((u) => u.active);
  const formerUsers = users.filter((u) => !u.active);

  return (
    <Shell
      profile={profile}
      active="team"
      title="Team"
      subtitle="Owner-only. Name your people, assign roles, and deactivate leavers."
      action={
        <Link href="/team/reassign" className={btnSecondary}>
          Reassign leads
        </Link>
      }
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
              className="font-semibold text-violet-700 underline dark:text-violet-400"
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
        title={`Active team (${activeUsers.length})`}
        description="New logins start as Agent. You can't change your own role — that keeps you from locking yourself out."
        padded={false}
      >
        <ul className="divide-y divide-[var(--border-soft)]">
          {activeUsers.map((u) => (
            <PersonRow key={u.id} u={u} selfId={profile.id} />
          ))}
        </ul>
      </Card>

      {formerUsers.length > 0 && (
        <Card
          title={`Deactivated (${formerUsers.length})`}
          description="Locked out of the app and hidden from dropdowns. Their leads and sales history stay intact. Tick Active + Save to bring someone back."
          padded={false}
        >
          <ul className="divide-y divide-[var(--border-soft)] opacity-70">
            {formerUsers.map((u) => (
              <PersonRow key={u.id} u={u} selfId={profile.id} />
            ))}
          </ul>
        </Card>
      )}

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        Deactivating someone locks them out of the app and hides them from
        dropdowns — reversible any time by ticking Active again. Their leads and
        sales history stay intact. When a person leaves for good, use{" "}
        <Link href="/team/reassign" className="font-semibold text-amber-600 hover:underline">
          Reassign leads
        </Link>{" "}
        to hand their clients to other agents first.
      </p>
    </Shell>
  );
}
