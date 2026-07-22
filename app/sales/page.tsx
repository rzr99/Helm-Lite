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
import { SERVICE_CATEGORIES, SERVICE_SUGGESTIONS, fmtMoney } from "@/lib/enums";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

type DealRow = {
  id: string;
  client_name: string;
  service: string | null;
  service_category: string | null;
  deal_size: number;
  revenue_received: number;
  date_closed: string;
  payment_method: string | null;
  merchant_name: string | null;
  social_platform: string | null;
  designer: string | null;
  agent: { full_name: string; avatar_url: string | null } | null;
  lead: { id: string; handle: string } | null;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    category?: string;
    agent?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const { service, category, agent, from, to } = await searchParams;

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
    .from("deals")
    .select(
      "id, client_name, service, service_category, deal_size, revenue_received, date_closed, payment_method, merchant_name, social_platform, designer, agent:users(full_name, avatar_url), lead:leads(id, handle)"
    )
    .order("date_closed", { ascending: false })
    .order("created_at", { ascending: false });

  if (service) query = query.eq("service", service);
  if (category) query = query.eq("service_category", category);
  if (floor && agent) query = query.eq("agent_id", agent);
  if (from) query = query.gte("date_closed", from);
  if (to) query = query.lte("date_closed", to);

  const { data } = await query;
  const deals = (data ?? []) as unknown as DealRow[];
  const hasFilters = Boolean(service || category || agent || from || to);

  const totalRevenue = deals.reduce((sum, d) => sum + Number(d.revenue_received), 0);
  const totalDealSize = deals.reduce((sum, d) => sum + Number(d.deal_size), 0);
  const avgDeal = deals.length > 0 ? totalDealSize / deals.length : 0;

  const categoryNames = [
    ...new Set(deals.map((d) => d.service_category || "Uncategorized")),
  ];
  const byCategory = categoryNames
    .map((name) => {
      const theirs = deals.filter(
        (d) => (d.service_category || "Uncategorized") === name
      );
      return {
        name,
        revenue: theirs.reduce((sum, d) => sum + Number(d.revenue_received), 0),
        count: theirs.length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const maxCategoryRevenue = Math.max(1, ...byCategory.map((c) => c.revenue));

  return (
    <Shell
      profile={profile}
      active="sales"
      title="Sales"
      subtitle={
        floor
          ? "Closed deals and revenue across the floor."
          : "Your closed deals and revenue."
      }
      action={
        <Link href="/sales/new" className={btnPrimary}>
          + Log deal
        </Link>
      }
    >
      <Card padded={false}>
        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
          <div>
            <label className={filterLabel}>Category</label>
            <select
              name="category"
              defaultValue={category ?? ""}
              className={inputClass}
            >
              <option value="">All categories</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabel}>Service</label>
            <input
              name="service"
              list="service-filter-list"
              defaultValue={service ?? ""}
              placeholder="All services"
              className={inputClass}
            />
            <datalist id="service-filter-list">
              {SERVICE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
            <label className={filterLabel}>Closed from</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className={filterLabel}>Closed to</label>
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
              <Link href="/sales" className={btnSecondary}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Revenue received{hasFilters ? " (filtered)" : ""}
          </p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {fmtMoney(totalRevenue)}
          </p>
        </Card>
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Deals closed{hasFilters ? " (filtered)" : ""}
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {deals.length}
          </p>
        </Card>
        <Card padded>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Average deal size
          </p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {fmtMoney(avgDeal)}
          </p>
        </Card>
      </div>

      {byCategory.length > 0 && (
        <Card
          title="Revenue by category"
          description="Which kind of work brings the most sales."
        >
          <ul className="flex flex-col gap-4">
            {byCategory.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {s.name}
                    <span className="ml-2 text-xs text-zinc-400">
                      {s.count} deal{s.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {fmtMoney(s.revenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{
                      width: `${Math.round((s.revenue / maxCategoryRevenue) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title={`${deals.length} deal${deals.length === 1 ? "" : "s"}${hasFilters ? " found" : ""}`}
        padded={false}
      >
        {deals.length === 0 ? (
          <EmptyState
            emoji={hasFilters ? "🔍" : "💰"}
            title={hasFilters ? "Nothing matches these filters" : "No deals yet"}
            hint={
              hasFilters
                ? "Try widening the date range or clearing a filter."
                : "When you close a lead, log the deal here and it counts toward revenue."
            }
            actionHref={hasFilters ? undefined : "/sales/new"}
            actionLabel={hasFilters ? undefined : "+ Log deal"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Sale</th>
                  <th className="px-5 py-3 font-semibold">Received</th>
                  <th className="px-5 py-3 font-semibold">Remaining</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Merchant</th>
                  <th className="px-5 py-3 font-semibold">Platform</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  {floor && <th className="px-5 py-3 font-semibold">Agent</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {deals.map((deal) => {
                  const remaining =
                    Number(deal.deal_size) - Number(deal.revenue_received);
                  return (
                  <tr
                    key={deal.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Link
                        href={`/sales/${deal.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {deal.client_name}
                      </Link>
                      {deal.lead && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          from {deal.lead.handle}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {deal.service_category ? (
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-[#f8f7f4]/80">
                          {deal.service_category}
                        </span>
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {deal.service ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {fmtMoney(Number(deal.deal_size))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-green-700 dark:text-green-400">
                      {fmtMoney(Number(deal.revenue_received))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {remaining > 0 ? fmtMoney(remaining) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {deal.payment_method ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {deal.merchant_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {deal.social_platform ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {deal.date_closed}
                    </td>
                    {floor && (
                      <td className="px-5 py-3.5">
                        {deal.agent ? (
                          <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                            <Avatar
                              name={deal.agent.full_name}
                              src={deal.agent.avatar_url}
                              size={7}
                            />
                            {deal.agent.full_name}
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
      </Card>
    </Shell>
  );
}
