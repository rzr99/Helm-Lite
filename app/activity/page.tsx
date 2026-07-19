import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { todayStr, toKarachiDate, daysAgoStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

type LeadRow = {
  id: string;
  handle: string;
  agent_id: string;
  date_added: string;
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; from?: string; to?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (!isFloorRole(profile.role)) redirect("/");

  const { agent, from, to } = await searchParams;
  const fromDate = from || daysAgoStr(6);
  const toDate = to || todayStr();

  const [{ data: users }, { data: leads }, { data: followUps }, { data: deals }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name"),
      supabase.from("leads").select("id, handle, agent_id, date_added"),
      supabase.from("follow_ups").select("agent_id, created_at"),
      supabase.from("deals").select("agent_id, date_closed"),
    ]);

  const nameOf = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const inRange = (d: string) => d >= fromDate && d <= toDate;
  const agentOk = (id: string) => !agent || id === agent;

  // date|agent -> { added, followUps, closes }
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

  for (const l of (leads ?? []) as LeadRow[]) {
    if (inRange(l.date_added) && agentOk(l.agent_id))
      bucket(l.date_added, l.agent_id).added++;
  }
  for (const f of followUps ?? []) {
    const d = toKarachiDate(f.created_at);
    if (inRange(d) && agentOk(f.agent_id)) bucket(d, f.agent_id).followUps++;
  }
  for (const d of deals ?? []) {
    if (inRange(d.date_closed) && agentOk(d.agent_id))
      bucket(d.date_closed, d.agent_id).closes++;
  }

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

  // ---- Duplicate checks (across ALL leads, ignoring filters) ----
  const byHandle = new Map<string, LeadRow[]>();
  for (const l of (leads ?? []) as LeadRow[]) {
    const key = l.handle.trim().toLowerCase();
    if (!key) continue;
    const list = byHandle.get(key) ?? [];
    list.push(l);
    byHandle.set(key, list);
  }
  const duplicates = [...byHandle.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([handle, list]) => {
      const agents = [...new Set(list.map((l) => l.agent_id))];
      return {
        handle,
        crossAgent: agents.length > 1,
        entries: list.map((l) => ({
          agent: nameOf.get(l.agent_id) ?? "Unknown",
          date: l.date_added,
          id: l.id,
        })),
      };
    })
    .sort((a, b) => Number(b.crossAgent) - Number(a.crossAgent));

  const hasFilters = Boolean(agent || from || to);

  return (
    <Shell
      profile={profile}
      active="activity"
      title="Daily activity"
      subtitle="Derived automatically from leads, follow-ups, and deals — nothing here is typed in by hand."
    >
      <Card padded={false}>
        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
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

      <div className="grid grid-cols-3 gap-6">
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Leads added</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {totals.added}
          </p>
        </Card>
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Follow-ups logged
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {totals.followUps}
          </p>
        </Card>
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Deals closed</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {totals.closes}
          </p>
        </Card>
      </div>

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
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
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
                    <td className="px-5 py-3.5 font-semibold text-emerald-700 dark:text-emerald-400">
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
        description="Same lead handle appearing more than once — across agents is serious, within one agent is usually a slip."
        padded={false}
      >
        {duplicates.length === 0 ? (
          <EmptyState
            emoji="✅"
            title="No duplicates found"
            hint="Every lead handle is unique right now."
          />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {duplicates.map((d) => (
              <li key={d.handle} className="px-5 py-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {d.handle}
                  </span>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                      (d.crossAgent
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300")
                    }
                  >
                    {d.crossAgent
                      ? "same handle under multiple agents"
                      : "entered more than once by the same agent"}
                  </span>
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {d.entries.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/leads/${e.id}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
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
