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
    intent?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (!isFloorRole(profile.role)) redirect("/");

  const { agent, from, to, intent } = await searchParams;
  const intentOk = intent === "high_intent" || intent === "cold_outreach";
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
    if (intentOk) sp.set("intent", intent!);
    sp.set("from", p.from);
    sp.set("to", p.to);
    return `/activity?${sp.toString()}`;
  };

  // Lead-type switch — keeps the current agent + date range.
  const intentHref = (v: string | null) => {
    const sp = new URLSearchParams();
    if (agent) sp.set("agent", agent);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (v) sp.set("intent", v);
    const s = sp.toString();
    return s ? `/activity?${s}` : "/activity";
  };

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

  // Leads added: the fast per-day view normally; from lead_clients (bounded by
  // the date range) when a lead type is selected, so we can split the count.
  let addedRows = (leadsAdded ?? []) as {
    agent_id: string;
    day: string;
    n: number;
  }[];
  let uniqueAddedCount = (uniqueAdded as number | null) ?? 0;
  if (intentOk) {
    let lc = supabase
      .from("lead_clients")
      .select("agent_id, first_added, handle_key")
      .gte("first_added", fromDate)
      .lte("first_added", toDate)
      .eq("rep_intent", intent)
      .limit(100000);
    if (agent) lc = lc.eq("agent_id", agent);
    const { data: lcData } = await lc;
    const perDay = new Map<string, number>();
    const uniq = new Set<string>();
    for (const r of (lcData ?? []) as {
      agent_id: string;
      first_added: string;
      handle_key: string;
    }[]) {
      const k = `${r.first_added}|${r.agent_id}`;
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
      uniq.add(r.handle_key);
    }
    addedRows = [...perDay].map(([k, n]) => {
      const [day, agent_id] = k.split("|");
      return { day, agent_id, n };
    });
    uniqueAddedCount = uniq.size;
  }

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
  for (const r of addedRows as DayRow[]) bucket(r.day, r.agent_id).added += r.n;
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

  const hasFilters = Boolean(agent || from || to);

  return (
    <Shell
      profile={profile}
      active="activity"
      title="Daily activity"
      subtitle="Derived automatically from leads, follow-ups, and deals — nothing here is typed in by hand."
    >
      {/* Lead type switch — All / High intent / Cold outreach */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { v: null as string | null, label: "All" },
          { v: "high_intent", label: "High intent" },
          { v: "cold_outreach", label: "Cold outreach" },
        ].map((t) => {
          const on = (t.v ?? null) === (intentOk ? intent : null);
          return (
            <Link
              key={t.label}
              href={intentHref(t.v)}
              className={
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (on
                  ? "bg-amber-600 text-[#140d05]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              {t.label}
            </Link>
          );
        })}
        {intentOk && (
          <span className="ml-1 text-xs text-[var(--text-faint)]">
            Filters leads added by type — follow-ups &amp; deals count all.
          </span>
        )}
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
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
          <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
            or pick a custom range below
          </span>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
          {intentOk && <input type="hidden" name="intent" value={intent} />}
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
              <Link
                href={intentOk ? `/activity?intent=${intent}` : "/activity"}
                className={btnSecondary}
              >
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
          note={
            <span title="Distinct clients — the same client added by two agents counts once.">
              <span className="text-amber-600">{uniqueAddedCount}</span> unique
              client{uniqueAddedCount === 1 ? "" : "s"}
            </span>
          }
        />
        <Readout label="Follow-ups logged" value={totals.followUps} />
        <Readout label="Deals closed" value={totals.closes} />
      </Readouts>

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
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r) => (
                  <tr
                    key={`${r.date}|${r.agentId}`}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {r.date}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <Avatar name={nameOf.get(r.agentId) ?? "?"} size={7} />
                        {nameOf.get(r.agentId) ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {r.added}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {r.followUps}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[var(--text)]">
                      {r.closes}
                    </td>
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
