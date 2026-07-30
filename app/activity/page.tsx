import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  Readouts,
  Readout,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/ui";
import { ActivityTimeline } from "@/components/activity-chart";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { todayStr, weekRange, monthRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    agent?: string;
    from?: string;
    to?: string;
    metric?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (!isFloorRole(profile.role)) redirect("/");

  const { agent, from, to, metric } = await searchParams;
  // Metric focus narrows the whole page to one measure.
  const focus =
    metric === "leads" || metric === "followups" || metric === "closed"
      ? metric
      : null;
  const metrics = [
    { key: "", label: "All" },
    { key: "leads", label: "Leads" },
    { key: "followups", label: "Follow-ups" },
    { key: "closed", label: "Closed" },
  ];
  // Default view is Today; the Daily/Weekly/Monthly buttons set exact ranges.
  const fromDate = from || todayStr();
  const toDate = to || todayStr();

  const week = weekRange();
  const month = monthRange();
  const presets = [
    { key: "daily", label: "Daily", from: todayStr(), to: todayStr() },
    { key: "weekly", label: "Weekly", from: week.from, to: week.to },
    { key: "monthly", label: "Monthly", from: month.from, to: month.to },
  ];
  const activePreset = presets.find(
    (p) => p.from === fromDate && p.to === toDate
  )?.key;
  const presetHref = (p: { from: string; to: string }) => {
    const sp = new URLSearchParams();
    if (agent) sp.set("agent", agent);
    if (focus) sp.set("metric", focus);
    sp.set("from", p.from);
    sp.set("to", p.to);
    return `/activity?${sp.toString()}`;
  };
  const metricHref = (m: string) => {
    const sp = new URLSearchParams();
    if (agent) sp.set("agent", agent);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (m) sp.set("metric", m);
    const s = sp.toString();
    return s ? `/activity?${s}` : "/activity";
  };
  // Which chart series the focus maps to.
  const chartFocus =
    focus === "leads"
      ? ("leads" as const)
      : focus === "followups"
        ? ("followUps" as const)
        : focus === "closed"
          ? ("deals" as const)
          : undefined;

  // Per-day/per-agent counts come pre-aggregated from Postgres, filtered to the
  // date range (and agent) server-side — no full-table scan into the app.
  const dayQuery = (table: string) => {
    let q = supabase
      .from(table)
      .select("agent_id, day, n")
      .gte("day", fromDate)
      .lte("day", toDate);
    if (agent) q = q.eq("agent_id", agent);
    return q;
  };

  const [
    { data: users },
    { data: leadsAdded },
    { data: followUpDays },
    { data: dealDays },
    { data: dupRows },
    { data: uniqueAdded },
  ] = await Promise.all([
    supabase.from("users").select("id, full_name").eq("active", true).order("full_name"),
    dayQuery("activity_leads_added"),
    dayQuery("activity_followups"),
    dayQuery("activity_deals"),
    supabase
      .from("lead_duplicate_entries")
      .select("handle_key, agent_id, lead_id, handle, date_added"),
    supabase.rpc("activity_unique_added", {
      p_from: fromDate,
      p_to: toDate,
      p_agent: agent || null,
    }),
  ]);

  const nameOf = new Map((users ?? []).map((u) => [u.id, u.full_name]));

  type DayRow = { agent_id: string; day: string; n: number };
  const buckets = new Map<
    string,
    { date: string; agentId: string; added: number; followUps: number; closes: number }
  >();
  function bucket(date: string, agentId: string) {
    const key = `${date}|${agentId}`;
    let b = buckets.get(key);
    if (!b) {
      b = { date, agentId, added: 0, followUps: 0, closes: 0 };
      buckets.set(key, b);
    }
    return b;
  }
  for (const r of (leadsAdded ?? []) as DayRow[]) bucket(r.day, r.agent_id).added += r.n;
  for (const r of (followUpDays ?? []) as DayRow[]) bucket(r.day, r.agent_id).followUps += r.n;
  for (const r of (dealDays ?? []) as DayRow[]) bucket(r.day, r.agent_id).closes += r.n;

  const rows = [...buckets.values()].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (nameOf.get(a.agentId) ?? "").localeCompare(nameOf.get(b.agentId) ?? "")
  );

  const totals = rows.reduce(
    (t, r) => ({
      added: t.added + r.added,
      followUps: t.followUps + r.followUps,
      closes: t.closes + r.closes,
    }),
    { added: 0, followUps: 0, closes: 0 }
  );
  const uniqueAddedCount = (uniqueAdded as number | null) ?? 0;

  // --- Chart data: stacked activity per day across the selected range -----
  function eachDay(from: string, to: string) {
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = to.split("-").map(Number);
    let cur = Date.UTC(fy, fm - 1, fd);
    const end = Date.UTC(ty, tm - 1, td);
    const out: string[] = [];
    let guard = 0;
    while (cur <= end && guard < 400) {
      out.push(new Date(cur).toISOString().slice(0, 10));
      cur += 86400000;
      guard++;
    }
    return out;
  }
  const timeline = eachDay(fromDate, toDate).map((day) => {
    let leads = 0;
    let followUps = 0;
    let deals = 0;
    for (const r of rows) {
      if (r.date === day) {
        leads += r.added;
        followUps += r.followUps;
        deals += r.closes;
      }
    }
    return { day, leads, followUps, deals };
  });
  const chartSubject =
    (agent ? `${nameOf.get(agent) ?? "Agent"}` : "Whole floor") +
    ` · ${fromDate} → ${toDate}`;

  // Cross-agent duplicates come straight from the view: it returns one row per
  // (client, agent) only for handles two or more DIFFERENT agents have worked.
  type DupRow = {
    handle_key: string;
    agent_id: string;
    lead_id: string;
    handle: string;
    date_added: string;
  };
  const dupMap = new Map<
    string,
    { handle: string; entries: { agent: string; date: string; id: string }[] }
  >();
  for (const r of (dupRows ?? []) as DupRow[]) {
    const g = dupMap.get(r.handle_key) ?? { handle: r.handle, entries: [] };
    g.entries.push({
      agent: nameOf.get(r.agent_id) ?? "Unknown",
      date: r.date_added,
      id: r.lead_id,
    });
    dupMap.set(r.handle_key, g);
  }
  const duplicates = [...dupMap.values()];

  const hasFilters = Boolean(agent || from || to || focus);

  // Table numeric cell: amber when in focus, dimmed when another metric is.
  const numCell = (m: string) =>
    "px-5 py-3.5 font-mono tabular-nums " +
    (focus === m
      ? "font-semibold text-amber-600"
      : focus
        ? "text-[var(--text-faint)]"
        : "text-[var(--text-muted)]");

  return (
    <Shell
      profile={profile}
      active="activity"
      title="Daily activity"
      subtitle="Derived automatically from leads, follow-ups, and deals — nothing here is typed in by hand."
    >
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-4">
          {presets.map((p) => (
            <Link
              key={p.key}
              href={presetHref(p)}
              className={
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (activePreset === p.key
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              {p.label}
            </Link>
          ))}
          <span className="ml-1 text-xs text-[var(--text-faint)]">
            or pick a custom range below
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3.5">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Focus
          </span>
          {metrics.map((m) => {
            const on = (focus ?? "") === m.key;
            return (
              <Link
                key={m.key || "all"}
                href={metricHref(m.key)}
                className={
                  "rounded-lg px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors " +
                  (on
                    ? "bg-amber-600 text-[#140d05]"
                    : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
                }
              >
                {m.label}
              </Link>
            );
          })}
        </div>
        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
          {focus && <input type="hidden" name="metric" value={focus} />}
          <div>
            <label className={filterLabel}>Agent</label>
            <select name="agent" defaultValue={agent ?? ""} className={inputClass}>
              <option value="">All agents</option>
              {(users ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={filterLabel}>From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className={inputClass}
            />
          </div>
          <div>
            <label className={filterLabel}>To</label>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              Filter
            </button>
            {hasFilters && (
              <Link href="/activity" className={btnSecondary}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Readouts cols={3}>
        <Readout
          label="Leads added"
          value={totals.added}
          dim={focus !== null && focus !== "leads"}
          note={
            <span title="Distinct clients — the same client added by two agents counts once.">
              <span className="text-amber-600">{uniqueAddedCount}</span> unique
              client{uniqueAddedCount === 1 ? "" : "s"}
            </span>
          }
        />
        <Readout
          label="Follow-ups logged"
          value={totals.followUps}
          dim={focus !== null && focus !== "followups"}
        />
        <Readout
          label="Deals closed"
          value={totals.closes}
          dim={focus !== null && focus !== "closed"}
        />
      </Readouts>

      <ActivityTimeline days={timeline} subject={chartSubject} focus={chartFocus} />

      <Card
        title={`Per agent, per day (${fromDate} → ${toDate})`}
        description="Days with no activity are hidden."
        padded={false}
      >
        {rows.length === 0 ? (
          <EmptyState
            emoji="🌙"
            title="No activity in this period"
            hint="Try a wider date range, or a different agent."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Agent</th>
                  <th className="px-5 py-3 font-semibold">Leads added</th>
                  <th className="px-5 py-3 font-semibold">Follow-ups logged</th>
                  <th className="px-5 py-3 font-semibold">Deals closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <tr
                    key={`${r.date}|${r.agentId}`}
                    className="transition-colors hover:bg-[var(--hover)]"
                  >
                    <td className="px-5 py-3.5 font-mono text-[var(--text)]">
                      {r.date}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 text-[var(--text)]">
                        <Avatar name={nameOf.get(r.agentId) ?? "?"} size={7} />
                        {nameOf.get(r.agentId) ?? "Unknown"}
                      </span>
                    </td>
                    <td className={numCell("leads")}>{r.added}</td>
                    <td className={numCell("followups")}>{r.followUps}</td>
                    <td className={numCell("closed")}>{r.closes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Duplicate warnings"
        description="The same client handle being worked by two different agents. One agent using several personas on a client is normal — that never shows here."
        padded={false}
      >
        {duplicates.length === 0 ? (
          <EmptyState
            emoji="✅"
            title="No clashes found"
            hint="No client is being worked by two different agents right now."
          />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {duplicates.map((d) => (
              <li key={d.handle} className="px-5 py-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {d.handle}
                  </span>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                    worked by {d.entries.length} agents
                  </span>
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {d.entries.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/leads/${e.id}`}
                        className="font-medium text-violet-400 hover:underline"
                      >
                        view lead
                      </Link>{" "}
                      — {e.agent}, added {e.date}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
