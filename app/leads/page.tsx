import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/ui";
import { LeadsSearch } from "@/components/leads-search";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, SERVICES, stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";
import { todayStr, weekRange, monthRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

type Entry = {
  id: string;
  persona: string | null;
  name: string | null;
  date_added: string;
};

type ClientRow = {
  agent_id: string;
  outreach_count: number;
  rep_id: string;
  rep_handle: string;
  rep_name: string | null;
  rep_service: string | null;
  rep_source: string | null;
  rep_stage: string;
  rep_persona: string | null;
  rep_date_added: string;
  entries: Entry[];
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    service?: string;
    agent?: string;
    from?: string;
    to?: string;
    page?: string;
    intent?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const { q, stage, service, agent, from, to, page, intent } =
    await searchParams;
  const search = (q ?? "").trim();
  const serviceOk = service && SERVICES.some((s) => s.value === service);
  const intentOk = intent === "high_intent" || intent === "cold_outreach";
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);

  let teammates: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    active: boolean;
  }[] = [];
  if (floor) {
    // All users, active first — so a deactivated leaver's leads still show their
    // name and stay filterable until their book is reassigned.
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, active")
      .order("active", { ascending: false })
      .order("full_name");
    teammates = data ?? [];
  }
  const userById = new Map(teammates.map((t) => [t.id, t]));

  // One row per client, pre-grouped and counted in Postgres. Filters, search,
  // and paging all run in the database — the app only ever holds one page.
  let query = supabase
    .from("lead_clients")
    .select(
      "agent_id, outreach_count, rep_id, rep_handle, rep_name, rep_service, rep_source, rep_stage, rep_persona, rep_date_added, entries",
      { count: "exact" }
    )
    .order("rep_date_added", { ascending: false });

  if (stage && STAGES.some((s) => s.value === stage)) {
    query = query.eq("rep_stage", stage);
  }
  if (serviceOk) {
    query = query.eq("rep_service", service);
  }
  if (floor && agent) {
    query = query.eq("agent_id", agent);
  }
  if (from) query = query.gte("rep_date_added", from);
  if (to) query = query.lte("rep_date_added", to);
  if (intentOk) query = query.eq("rep_intent", intent);
  for (const token of search.toLowerCase().split(/\s+/).filter(Boolean)) {
    query = query.ilike("search_text", `%${token}%`);
  }
  query = query.range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

  // Distinct-client count for the SAME filters (the floor can have the same
  // client under two agents; an agent's unique always equals their total).
  const uniquePromise = floor
    ? supabase.rpc("lead_unique_count", {
        p_stage: stage && STAGES.some((s) => s.value === stage) ? stage : null,
        p_service: serviceOk ? service : null,
        p_agent: agent || null,
        p_from: from || null,
        p_to: to || null,
        p_search: search || null,
      })
    : null;

  const [{ data, count }, uniqueRes, assignedRes] = await Promise.all([
    query,
    uniquePromise,
    supabase.from("leads").select("handle_key").eq("assigned_to", profile.id),
  ]);
  const assignedCount = new Set(
    (assignedRes.data ?? []).map((r) => r.handle_key as string)
  ).size;
  const clients = (data ?? []) as unknown as ClientRow[];
  const total = count ?? 0;
  const uniqueClients = (uniqueRes?.data as number | null) ?? total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || stage || serviceOk || agent || from || to);

  // Filtered to one agent (floor view): split their clients into ones only they
  // work vs ones another agent also works.
  let agentExclusive: number | null = null;
  let agentShared = 0;
  if (floor && agent) {
    let akq = supabase
      .from("lead_clients")
      .select("handle_key")
      .eq("agent_id", agent)
      .limit(100000);
    if (stage && STAGES.some((s) => s.value === stage))
      akq = akq.eq("rep_stage", stage);
    if (serviceOk) akq = akq.eq("rep_service", service);
    if (from) akq = akq.gte("rep_date_added", from);
    if (to) akq = akq.lte("rep_date_added", to);
    if (intentOk) akq = akq.eq("rep_intent", intent);
    for (const token of search.toLowerCase().split(/\s+/).filter(Boolean)) {
      akq = akq.ilike("search_text", `%${token}%`);
    }
    const { data: akData } = await akq;
    const agentKeys = [
      ...new Set((akData ?? []).map((r) => r.handle_key as string)),
    ];
    if (agentKeys.length > 0) {
      const { data: otherData } = await supabase
        .from("lead_clients")
        .select("handle_key")
        .in("handle_key", agentKeys)
        .neq("agent_id", agent)
        .limit(100000);
      agentShared = new Set(
        (otherData ?? []).map((r) => r.handle_key as string)
      ).size;
      agentExclusive = agentKeys.length - agentShared;
    } else {
      agentExclusive = 0;
    }
  }

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (stage) sp.set("stage", stage);
    if (serviceOk) sp.set("service", service!);
    if (agent) sp.set("agent", agent);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (intentOk) sp.set("intent", intent!);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/leads?${s}` : "/leads";
  };

  // The All / High intent / Cold outreach switch — keeps the other filters.
  const intentHref = (v: string | null) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (stage) sp.set("stage", stage);
    if (serviceOk) sp.set("service", service!);
    if (agent) sp.set("agent", agent);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (v) sp.set("intent", v);
    const s = sp.toString();
    return s ? `/leads?${s}` : "/leads";
  };

  // Quick date ranges (work for agents too — they filter their own leads).
  const week = weekRange();
  const month = monthRange();
  const datePresets = [
    { key: "daily", label: "Today", from: todayStr(), to: todayStr() },
    { key: "weekly", label: "This week", from: week.from, to: week.to },
    { key: "monthly", label: "This month", from: month.from, to: month.to },
  ];
  const activePreset = datePresets.find(
    (r) => r.from === from && r.to === to
  )?.key;
  const presetHref = (r: { from: string; to: string }) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (stage) sp.set("stage", stage);
    if (serviceOk) sp.set("service", service!);
    if (agent) sp.set("agent", agent);
    if (intentOk) sp.set("intent", intent!);
    sp.set("from", r.from);
    sp.set("to", r.to);
    return `/leads?${sp.toString()}`;
  };

  return (
    <Shell
      profile={profile}
      active="leads"
      title={floor ? "All leads" : "My leads"}
      subtitle={
        floor
          ? "Every lead on the floor. Use the filters to slice by agent, stage, or date."
          : "Every lead you're working. Use the filters to narrow things down."
      }
      action={
        <Link href="/leads/new" className={btnPrimary}>
          + Add lead
        </Link>
      }
    >
      {assignedCount > 0 && (
        <Link
          href="/leads/assigned"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-5 py-3.5 text-sm text-[var(--text)] transition-opacity hover:opacity-90"
        >
          <span>
            <span className="font-semibold text-amber-600">{assignedCount}</span>{" "}
            {assignedCount === 1 ? "client" : "clients"} assigned to you by
            another agent — kept separate from your list until you accept.
          </span>
          <span className="shrink-0 font-medium text-amber-600">Review →</span>
        </Link>
      )}

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
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
          {datePresets.map((r) => (
            <Link
              key={r.key}
              href={presetHref(r)}
              className={
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (activePreset === r.key
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              {r.label}
            </Link>
          ))}
          <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
            quick date filters — or set a custom range below
          </span>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
          {/* Keep the active search + lead-type switch when other filters submit. */}
          {search && <input type="hidden" name="q" value={search} />}
          {intentOk && <input type="hidden" name="intent" value={intent} />}
          <div>
            <label className={filterLabel}>Stage</label>
            <select name="stage" defaultValue={stage ?? ""} className={inputClass}>
              <option value="">All stages</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabel}>Service</label>
            <select
              name="service"
              defaultValue={serviceOk ? service : ""}
              className={inputClass}
            >
              <option value="">All services</option>
              {SERVICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {floor && (
            <div>
              <label className={filterLabel}>Agent</label>
              <select name="agent" defaultValue={agent ?? ""} className={inputClass}>
                <option value="">All agents</option>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                    {t.active ? "" : " · deactivated"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={filterLabel}>Added from</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={filterLabel}>Added to</label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              Filter
            </button>
            {hasFilters && (
              <Link
                href={intentOk ? `/leads?intent=${intent}` : "/leads"}
                className={btnSecondary}
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card
        title={`${total} client${total === 1 ? "" : "s"}${
          hasFilters ? " found" : ""
        }`}
        description={
          floor && agent && agentExclusive !== null
            ? `${agentExclusive} only theirs · ${agentShared} also worked by another agent`
            : floor && !intentOk
              ? `${uniqueClients} unique — the same client worked by two agents counts once here`
              : undefined
        }
        padded={false}
      >
        <LeadsSearch initial={search} />

        {clients.length === 0 ? (
          hasFilters ? (
            <EmptyState
              emoji="🔍"
              title="Nothing matches these filters"
              hint="Try a different name, widen the date range, or clear a filter."
            />
          ) : (
            <EmptyState
              emoji="🌱"
              title="No leads yet"
              hint="Add your first lead and it will show up here."
              actionHref="/leads/new"
              actionLabel="+ Add lead"
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Service</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Source</th>
                  <th className="px-5 py-3 font-semibold">Stage</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Added</th>
                  {floor && (
                    <th className="hidden px-5 py-3 font-semibold sm:table-cell">
                      Agent
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {clients.map((c) => {
                  const entries = c.entries ?? [];
                  const multi = entries.length > 1;
                  const ag = userById.get(c.agent_id);
                  return (
                    <tr
                      key={c.rep_id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3.5 align-top">
                        <Link
                          href={`/leads/${c.rep_id}`}
                          className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {c.rep_handle}
                        </Link>
                        {!multi && c.rep_name && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {c.rep_name}
                          </p>
                        )}
                        {multi && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                              Reached from:
                            </span>
                            {entries.map((e) => (
                              <Link
                                key={e.id}
                                href={`/leads/${e.id}`}
                                title={`Added ${e.date_added}`}
                                className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:border-amber-500 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:text-amber-400"
                              >
                                {e.persona || e.name || e.date_added}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 align-top text-zinc-600 sm:table-cell dark:text-zinc-400">
                        {serviceLabel(c.rep_service)}
                      </td>
                      <td className="hidden px-5 py-3.5 align-top text-zinc-600 sm:table-cell dark:text-zinc-400">
                        {c.rep_source ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-xs font-semibold " +
                            (STAGE_BADGE[c.rep_stage] ?? "")
                          }
                        >
                          {stageLabel(c.rep_stage)}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3.5 align-top text-zinc-600 sm:table-cell dark:text-zinc-400">
                        {c.rep_date_added}
                      </td>
                      {floor && (
                        <td className="hidden px-5 py-3.5 align-top sm:table-cell">
                          {ag ? (
                            <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              <Avatar
                                name={ag.full_name}
                                src={ag.avatar_url}
                                size={7}
                              />
                              {ag.full_name}
                              {!ag.active && (
                                <span className="rounded-full border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                                  inactive
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 text-sm dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">
              Page {pageNum} of {totalPages}
            </span>
            <div className="flex gap-2">
              {pageNum > 1 ? (
                <Link href={pageHref(pageNum - 1)} className={btnSecondary}>
                  ← Prev
                </Link>
              ) : (
                <span className={btnSecondary + " opacity-40"}>← Prev</span>
              )}
              {pageNum < totalPages ? (
                <Link href={pageHref(pageNum + 1)} className={btnSecondary}>
                  Next →
                </Link>
              ) : (
                <span className={btnSecondary + " opacity-40"}>Next →</span>
              )}
            </div>
          </div>
        )}
      </Card>
    </Shell>
  );
}
