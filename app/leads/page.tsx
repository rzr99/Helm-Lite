import Link from "next/link";
import { Nav } from "@/components/nav";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";

export const dynamic = "force-dynamic";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const labelClass =
  "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";

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
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Nav profile={profile} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {floor ? "All leads" : "My leads"}
          </h1>
          <Link
            href="/leads/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            + Add lead
          </Link>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div>
            <label className={labelClass}>Stage</label>
            <select name="stage" defaultValue={stage ?? ""} className={inputClass}>
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
              <label className={labelClass}>Agent</label>
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
            <label className={labelClass}>Added from</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Added to</label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Apply filters
          </button>
          {hasFilters && (
            <Link
              href="/leads"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Clear
            </Link>
          )}
        </form>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {leads.length} lead{leads.length === 1 ? "" : "s"}
          {hasFilters ? (leads.length === 1 ? " matches" : " match") + " the filters" : ""}
        </p>

        {leads.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {hasFilters
              ? "Nothing matches these filters."
              : "No leads here yet. Click “Add lead” to create the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Handle</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  {floor && <th className="px-4 py-3 font-medium">Agent</th>}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-black hover:underline dark:text-zinc-50"
                      >
                        {lead.handle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {serviceLabel(lead.service_interest)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.source ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          (STAGE_BADGE[lead.stage] ?? "")
                        }
                      >
                        {stageLabel(lead.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.date_added}
                    </td>
                    {floor && (
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {lead.agent?.full_name ?? "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
