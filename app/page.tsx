import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Avatar, Readouts, Readout, btnPrimary, btnGhost } from "@/components/ui";
import { DashboardSummary } from "@/components/dashboard-summary";
import { getDashboardSummary } from "@/lib/dashboard-summary";
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

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    win?: string;
    from?: string;
    to?: string;
    agent?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const owner = profile.role === "owner";
  const firstName = profile.full_name.split(" ")[0] || profile.full_name;

  const today = todayStr();

  const { view, win: winRaw, from, to, agent } = await searchParams;
  const isSummary = view === "summary";
  const win = winRaw === "day" || winRaw === "week" ? winRaw : "month";
  const summary = isSummary
    ? await getDashboardSummary(supabase, { win, from, to, agent, floor, owner, today })
    : null;

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

  // The stage carrying the most leads is lit like a keyframe on the track.
  let keyStage: string = STAGES[0].value;
  for (const s of STAGES) {
    if ((counts[s.value] ?? 0) > (counts[keyStage] ?? 0)) keyStage = s.value;
  }
  const dueNow = overdue.length + dueToday.length;

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
      <div className="mb-3 flex gap-1">
        <Link
          href="/"
          className={
            "rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors " +
            (!isSummary
              ? "bg-amber-600 text-[#140d05]"
              : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
          }
        >
          Overview
        </Link>
        <Link
          href="/?view=summary"
          className={
            "rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors " +
            (isSummary
              ? "bg-amber-600 text-[#140d05]"
              : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
          }
        >
          Summary
        </Link>
      </div>

      {isSummary && summary ? (
        <DashboardSummary {...summary} />
      ) : (
        <>
      {/* Pipeline — a keyframe track, framed like a viewfinder */}
      <div className="relative my-1 px-6 py-9">
        <span className="pointer-events-none absolute left-0 top-0 h-3.5 w-3.5 border-l border-t border-[var(--border-strong)]" />
        <span className="pointer-events-none absolute right-0 top-0 h-3.5 w-3.5 border-r border-t border-[var(--border-strong)]" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-3.5 w-3.5 border-b border-l border-[var(--border-strong)]" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-3.5 w-3.5 border-b border-r border-[var(--border-strong)]" />

        <div className="grid grid-cols-5 text-center">
          {STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/leads?stage=${s.value}`}
              className="font-mono text-[30px] font-medium tabular-nums tracking-tight text-[var(--text)] transition-colors hover:text-amber-600"
            >
              {counts[s.value] ?? 0}
            </Link>
          ))}
        </div>
        <div className="relative my-3.5 grid grid-cols-5">
          <span className="pointer-events-none absolute inset-x-[9%] top-1/2 h-px -translate-y-1/2 bg-[var(--border)]" />
          {STAGES.map((s) => {
            const lit = s.value === keyStage && (counts[keyStage] ?? 0) > 0;
            return (
              <span key={s.value} className="flex justify-center">
                <span
                  className={
                    "relative z-10 h-2.5 w-2.5 rotate-45 " +
                    (lit
                      ? "border border-amber-600 bg-amber-600"
                      : "border-[1.5px] border-[var(--text-faint)] bg-[var(--canvas)]")
                  }
                  style={lit ? { boxShadow: "0 0 0 5px var(--accent-soft)" } : undefined}
                />
              </span>
            );
          })}
        </div>
        <div className="grid grid-cols-5 text-center">
          {STAGES.map((s) => (
            <span
              key={s.value}
              className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-muted)]"
            >
              {stageLabel(s.value)}
            </span>
          ))}
        </div>
      </div>

      <Readouts cols={4}>
        <Readout label="Clients logged" value={totals.total_clients} />
        <Readout label="Unique clients" value={totals.unique_clients} amber />
        <Readout label="Deals closed" value={counts["closed"] ?? 0} />
        <Readout label="Due now" value={dueNow} negative={dueNow > 0} />
      </Readouts>

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
                    <span className="font-semibold text-[var(--text)]">
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

      <p className="text-center text-xs text-[var(--text-faint)]">
        {floor
          ? "You can see every agent's leads and follow-ups."
          : "You only see your own leads and follow-ups."}
      </p>
        </>
      )}
    </Shell>
  );
}
