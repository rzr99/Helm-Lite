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
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

type LeadRow = {
  id: string;
  handle: string;
  name: string | null;
  service_interest: string | null;
  source: string | null;
  stage: string;
  date_added: string;
  agent: { full_name: string } | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    agent?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const { stage, agent, from, to } = await searchParams;

  let teammates: { id: string; full_name: string }[] = [];
  if (floor) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name");
    teammates = data ?? [];
  }

  let query = supabase
    .from("leads")
    .select(
      "id, handle, name, service_interest, source, stage, date_added, agent:users(full_name)"
    )
    .order("date_added", { ascending: false })
    .order("created_at", { ascending: false });

  if (stage && STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage);
  }
  if (floor && agent) {
    query = query.eq("agent_id", agent);
  }
  if (from) query = query.gte("date_added", from);
  if (to) query = query.lte("date_added", to);

  const { data } = await query;
  const leads = (data ?? []) as unknown as LeadRow[];
  const hasFilters = Boolean(stage || agent || from || to);

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
      <Card padded={false}>
        <form
          method="get"
          className="flex flex-wrap items-end gap-4 px-5 py-4"
        >
          <div>
            <label className={filterLabel}>Stage</label>
            <select
              name="stage"
              defaultValue={stage ?? ""}
              className={inputClass}
            >
              <option value="">All stages</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {floor && (
            <div>
              <label className={filterLabel}>Agent</label>
              <select
                name="agent"
                defaultValue={agent ?? ""}
                className={inputClass}
              >
                <option value="">All agents</option>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
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
              <Link href="/leads" className={btnSecondary}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card
        title={`${leads.length} lead${leads.length === 1 ? "" : "s"}${hasFilters ? " found" : ""}`}
        padded={false}
      >
        {leads.length === 0 ? (
          <EmptyState
            emoji={hasFilters ? "🔍" : "🌱"}
            title={hasFilters ? "Nothing matches these filters" : "No leads yet"}
            hint={
              hasFilters
                ? "Try widening the date range or clearing a filter."
                : "Add your first lead and it will show up here."
            }
            actionHref={hasFilters ? undefined : "/leads/new"}
            actionLabel={hasFilters ? undefined : "+ Add lead"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Lead</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Stage</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                  {floor && <th className="px-5 py-3 font-semibold">Agent</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {lead.handle}
                      </Link>
                      {lead.name && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {lead.name}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {serviceLabel(lead.service_interest)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {lead.source ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (STAGE_BADGE[lead.stage] ?? "")
                        }
                      >
                        {stageLabel(lead.stage)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {lead.date_added}
                    </td>
                    {floor && (
                      <td className="px-5 py-3.5">
                        {lead.agent ? (
                          <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                            <Avatar name={lead.agent.full_name} size={7} />
                            {lead.agent.full_name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
