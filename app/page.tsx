import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Avatar, btnPrimary, btnGhost } from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel } from "@/lib/enums";
import { setFollowUpDone } from "@/app/leads/actions";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

type FollowUpRow = {
  id: string;
  due_date: string;
  note: string;
  lead: { id: string; handle: string; persona: string | null } | null;
  agent: { full_name: string } | null;
};

const stageAccent: Record<string, string> = {
  new: "text-[#f8f7f4]",
  in_conversation: "text-[#f8f7f4]",
  qualified: "text-[#f8f7f4]",
  closed: "text-amber-600",
  lost: "text-[#f8f7f4]/40",
};

const stageBar: Record<string, string> = {
  new: "bg-[#f8f7f4]/20",
  in_conversation: "bg-[#f8f7f4]/20",
  qualified: "bg-[#f8f7f4]/20",
  closed: "bg-amber-600",
  lost: "bg-[#f8f7f4]/10",
};

export default async function Dashboard() {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const firstName = profile.full_name.split(" ")[0] || profile.full_name;

  const today = todayStr();

  // Counts come pre-aggregated from Postgres (views group by unique client),
  // so the dashboard never loads the whole leads table to add it up.
  const [
    { data: followUps },
    { data: stageCounts },
    { data: agentStats },
    { data: clientTotals },
  ] = await Promise.all([
    supabase
      .from("follow_ups")
      .select(
        "id, due_date, note, lead:leads(id, handle, persona), agent:users(full_name)"
      )
      .eq("done", false)
      .order("due_date")
      .limit(200),
    supabase.from("pipeline_counts").select("stage, n"),
    supabase.from("agent_lead_stats").select("agent_id, total_clients, added_today, closed"),
    supabase.from("client_totals").select("total_clients, unique_clients").single(),
  ]);

  const totals = (clientTotals ?? { total_clients: 0, unique_clients: 0 }) as {
    total_clients: number;
    unique_clients: number;
  };

  let teammates: { id: string; full_name: string; avatar_url: string | null }[] =
    [];
  if (floor) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .eq("active", true)
      .order("full_name");
    teammates = data ?? [];
  }

  const rows = (followUps ?? []) as unknown as FollowUpRow[];
  const overdue = rows.filter((f) => f.due_date < today);
  const dueToday = rows.filter((f) => f.due_date === today);
  const upcoming = rows.filter((f) => f.due_date > today);

  const counts: Record<string, number> = {};
  for (const c of (stageCounts ?? []) as { stage: string; n: number }[]) {
    counts[c.stage] = c.n;
  }

  const statsByAgent = new Map(
    ((agentStats ?? []) as {
      agent_id: string;
      total_clients: number;
      added_today: number;
      closed: number;
    }[]).map((s) => [s.agent_id, s])
  );
  const byAgent = teammates.map((t) => {
    const s = statsByAgent.get(t.id);
    return {
      ...t,
      total: s?.total_clients ?? 0,
      addedToday: s?.added_today ?? 0,
      closed: s?.closed ?? 0,
    };
  });

  function FollowUpItem({
    f,
    tone,
  }: {
    f: FollowUpRow;
    tone: "red" | "amber" | "zinc";
  }) {
    const markDone = setFollowUpDone.bind(null, f.id, true, "/");
    return (
      <li className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={
              "h-2.5 w-2.5 shrink-0 rounded-full " +
              (tone === "red"
                ? "bg-red-500"
                : tone === "amber"
                  ? "bg-amber-400"
                  : "bg-zinc-300 dark:bg-zinc-600")
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
              {f.lead?.persona && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  via {f.lead.persona}
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
          floor
            ? "All leads by stage — click a stage to open it."
            : "Your leads by stage — click a stage to open it."
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-white/[0.06] pb-4">
          <div>
            <span className="text-2xl font-bold tabular-nums text-[#f8f7f4]">
              {totals.total_clients}
            </span>
            <span className="ml-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              leads logged
            </span>
          </div>
          {floor && (
            <div title="Distinct clients — the same client worked by two agents counts once here.">
              <span className="text-2xl font-bold tabular-nums text-amber-500">
                {totals.unique_clients}
              </span>
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                unique clients
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/leads?stage=${s.value}`}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]"
            >
              <span
                className={
                  "absolute inset-x-0 top-0 h-0.5 opacity-70 " +
                  (stageBar[s.value] ?? "bg-zinc-600")
                }
              />
              <p
                className={
                  "text-3xl font-bold tabular-nums " + (stageAccent[s.value] ?? "")
                }
              >
                {counts[s.value] ?? 0}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
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
                  <Avatar name={a.full_name} src={a.avatar_url} />
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
                    <span className="font-semibold text-green-500 dark:text-green-400">
                      {a.closed}
                    </span>{" "}
                    closed
                  </span>
                  <Link
                    href={`/leads?agent=${a.id}`}
                    className="font-semibold text-violet-400 hover:underline"
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
        description="Overdue first, then today, then what's coming."
        padded={false}
      >
        {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="All caught up"
            hint="No open follow-ups anywhere. Add follow-up dates on your leads and they'll show up here."
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
            {upcoming.length > 0 && (
              <>
                <p className="border-b border-t border-zinc-100 bg-zinc-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
                  Upcoming · {upcoming.length}
                </p>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {upcoming.map((f) => (
                    <FollowUpItem key={f.id} f={f} tone="zinc" />
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
