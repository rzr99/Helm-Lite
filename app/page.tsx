import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Avatar, btnPrimary, btnGhost } from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel } from "@/lib/enums";
import { setFollowUpDone } from "@/app/leads/actions";

export const dynamic = "force-dynamic";

type FollowUpRow = {
  id: string;
  due_date: string;
  note: string;
  lead: { id: string; handle: string } | null;
  agent: { full_name: string } | null;
};

const stageAccent: Record<string, string> = {
  new: "text-sky-600 dark:text-sky-400",
  in_conversation: "text-amber-600 dark:text-amber-400",
  qualified: "text-violet-600 dark:text-violet-400",
  closed: "text-emerald-600 dark:text-emerald-400",
  lost: "text-zinc-400 dark:text-zinc-500",
};

export default async function Dashboard() {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const firstName = profile.full_name.split(" ")[0] || profile.full_name;

  const today = new Date().toISOString().slice(0, 10);

  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("id, due_date, note, lead:leads(id, handle), agent:users(full_name)")
    .eq("done", false)
    .lte("due_date", today)
    .order("due_date");

  const { data: leadRows } = await supabase
    .from("leads")
    .select("stage, agent_id, date_added");

  let teammates: { id: string; full_name: string }[] = [];
  if (floor) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name");
    teammates = data ?? [];
  }

  const rows = (followUps ?? []) as unknown as FollowUpRow[];
  const overdue = rows.filter((f) => f.due_date < today);
  const dueToday = rows.filter((f) => f.due_date === today);

  const counts: Record<string, number> = {};
  for (const lead of leadRows ?? []) {
    counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
  }

  const byAgent = teammates.map((t) => {
    const theirs = (leadRows ?? []).filter((l) => l.agent_id === t.id);
    return {
      ...t,
      total: theirs.length,
      addedToday: theirs.filter((l) => l.date_added === today).length,
      closed: theirs.filter((l) => l.stage === "closed").length,
    };
  });

  function FollowUpItem({ f, tone }: { f: FollowUpRow; tone: "red" | "amber" }) {
    const markDone = setFollowUpDone.bind(null, f.id, true, "/");
    return (
      <li className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={
              "h-2.5 w-2.5 shrink-0 rounded-full " +
              (tone === "red" ? "bg-red-500" : "bg-amber-400")
            }
          />
          <div className="min-w-0">
            <p className="truncate">
              <Link
                href={f.lead ? `/leads/${f.lead.id}` : "/leads"}
                className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {f.lead?.handle ?? "(lead)"}
              </Link>
              <span className="ml-2 text-sm text-zinc-400">{f.due_date}</span>
              {floor && f.agent && (
                <span className="ml-2 text-sm text-zinc-400">
                  · {f.agent.full_name}
                </span>
              )}
            </p>
            {f.note && (
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {f.note}
              </p>
            )}
          </div>
        </div>
        <form action={markDone}>
          <button type="submit" className={btnGhost} title="Mark as done">
            ✓ Done
          </button>
        </form>
      </li>
    );
  }

  return (
    <Shell
      profile={profile}
      active="dashboard"
      title={`Welcome back, ${firstName}`}
      subtitle={
        floor
          ? "Here's what's happening across the sales floor."
          : "Here's where your pipeline stands."
      }
      action={
        <Link href="/leads/new" className={btnPrimary}>
          + Add lead
        </Link>
      }
    >
      <Card
        title="Pipeline"
        description={
          floor ? "All leads by stage — click a stage to open it." : "Your leads by stage — click a stage to open it."
        }
        padded={false}
      >
        <div className="grid grid-cols-2 divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-5 sm:divide-x">
          {STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/leads?stage=${s.value}`}
              className="px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <p
                className={
                  "text-2xl font-bold " + (stageAccent[s.value] ?? "")
                }
              >
                {counts[s.value] ?? 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {stageLabel(s.value)}
              </p>
            </Link>
          ))}
        </div>
      </Card>

      {floor && byAgent.length > 0 && (
        <Card
          title="Team"
          description="Each agent's numbers — click through to see their leads."
          padded={false}
        >
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {byAgent.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={a.full_name} />
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {a.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {a.total}
                    </span>{" "}
                    {a.total === 1 ? "lead" : "leads"}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {a.addedToday}
                    </span>{" "}
                    today
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {a.closed}
                    </span>{" "}
                    closed
                  </span>
                  <Link
                    href={`/leads?agent=${a.id}`}
                    className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    View →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Follow-ups"
        description="Everything that needs a touch today — overdue first."
        padded={false}
      >
        {overdue.length === 0 && dueToday.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="All caught up"
            hint="No follow-ups due or overdue. Add follow-up dates on your leads and they'll show up here."
          />
        ) : (
          <div>
            {overdue.length > 0 && (
              <>
                <p className="border-b border-zinc-100 bg-red-50/60 px-5 py-2 text-xs font-bold uppercase tracking-wide text-red-700 dark:border-zinc-800 dark:bg-red-950/40 dark:text-red-300">
                  Overdue · {overdue.length}
                </p>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {overdue.map((f) => (
                    <FollowUpItem key={f.id} f={f} tone="red" />
                  ))}
                </ul>
              </>
            )}
            {dueToday.length > 0 && (
              <>
                <p className="border-b border-t border-zinc-100 bg-amber-50/60 px-5 py-2 text-xs font-bold uppercase tracking-wide text-amber-700 dark:border-zinc-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Due today · {dueToday.length}
                </p>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dueToday.map((f) => (
                    <FollowUpItem key={f.id} f={f} tone="amber" />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        {floor
          ? "You can see every agent's leads and follow-ups."
          : "You only see your own leads and follow-ups."}
      </p>
    </Shell>
  );
}
