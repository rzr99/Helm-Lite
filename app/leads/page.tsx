import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { LeadsLive, type LeadRow } from "@/components/leads-live";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES } from "@/lib/enums";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

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
      "id, handle, name, service_interest, source, stage, date_added, agent:users(full_name, avatar_url)"
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

      <LeadsLive leads={leads} floor={floor} hasServerFilters={hasFilters} />
    </Shell>
  );
}
