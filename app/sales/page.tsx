import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  Readouts,
  Readout,
  btnPrimary,
  btnSecondary,
  pillClass,
  pillActiveClass,
  inputClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { SERVICE_CATEGORIES, SERVICE_SUGGESTIONS, fmtMoney } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { BALANCE_TRACKING_FROM } from "@/lib/sales";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
function monthLastDay(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

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
  conversation: string | null;
  designer: string | null;
  agent: { full_name: string; avatar_url: string | null } | null;
  lead: { id: string; handle: string } | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  paid_on: string;
  payment_method: string | null;
  note: string | null;
  deal: {
    id: string;
    client_name: string;
    service_category: string | null;
    deal_size: number;
    date_closed: string;
    agent: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

// closed = sales closed this month · payments = cash that came in this month
// (any sale) · unpaid = every sale still owing money, any month.
type View = "closed" | "payments" | "unpaid";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    category?: string;
    agent?: string;
    month?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const {
    service,
    category,
    agent,
    month: monthRaw,
    page,
    view: viewRaw,
  } = await searchParams;
  const view: View =
    viewRaw === "payments" || viewRaw === "unpaid" ? viewRaw : "closed";
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);

  // Default to the current month, so a fresh month starts empty until deals land.
  const currentMonth = todayStr().slice(0, 7);
  const month = monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : currentMonth;
  const monthStart = `${month}-01`;
  const nextMonthStart = `${shiftMonth(month, 1)}-01`;
  const monthEnd = monthLastDay(month);

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
      "id, client_name, service, service_category, deal_size, revenue_received, date_closed, payment_method, merchant_name, social_platform, conversation, designer, agent:users(full_name, avatar_url), lead:leads(id, handle)",
      { count: "exact" }
    )
    .order("date_closed", { ascending: false })
    .order("created_at", { ascending: false });

  if (service) query = query.eq("service", service);
  if (category) query = query.eq("service_category", category);
  if (floor && agent) query = query.eq("agent_id", agent);
  if (view === "unpaid") {
    query = query.gt("balance", 0).gte("date_closed", BALANCE_TRACKING_FROM);
  } else {
    query = query
      .gte("date_closed", monthStart)
      .lt("date_closed", nextMonthStart);
  }
  query = query.range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

  // Payments that came in this month, on any sale (filters apply to the sale).
  let payQuery = supabase
    .from("deal_payments")
    .select(
      "id, amount, paid_on, payment_method, note, deal:deals!inner(id, client_name, service, service_category, deal_size, date_closed, agent_id, agent:users(full_name, avatar_url))",
      { count: "exact" }
    )
    .gte("paid_on", monthStart)
    .lt("paid_on", nextMonthStart)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (service) payQuery = payQuery.eq("deal.service", service);
  if (category) payQuery = payQuery.eq("deal.service_category", category);
  if (floor && agent) payQuery = payQuery.eq("agent_id", agent);
  payQuery = payQuery.range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

  // Totals + category breakdown for the WHOLE filtered set come from the DB,
  // so they stay correct no matter which page of the list is shown.
  // Still owed: only sales closed since payment tracking began (older ones
  // were logged once per instalment, so their remaining isn't real).
  let owedQuery = supabase
    .from("deals")
    .select("balance")
    .gt("balance", 0)
    .gte("date_closed", BALANCE_TRACKING_FROM)
    .limit(100000);
  if (service) owedQuery = owedQuery.eq("service", service);
  if (category) owedQuery = owedQuery.eq("service_category", category);
  if (floor && agent) owedQuery = owedQuery.eq("agent_id", agent);

  const [{ data, count }, { data: summaryData }, { data: owedData }] =
    await Promise.all([
    view === "payments" ? payQuery : query,
    supabase.rpc("deal_summary", {
      p_service: service || null,
      p_category: category || null,
      p_agent: floor && agent ? agent : null,
      p_from: monthStart,
      p_to: monthEnd,
    }),
    owedQuery,
  ]);

  const deals = (view === "payments" ? [] : data ?? []) as unknown as DealRow[];
  const payments = (
    view === "payments" ? data ?? [] : []
  ) as unknown as PaymentRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(service || category || agent);

  const summary = (summaryData ?? {}) as {
    total_received?: number;
    total_size?: number;
    deal_count?: number;
    by_category?: { name: string; revenue: number; count: number }[];
  };
  const totalRevenue = Number(summary.total_received ?? 0);
  const dealCount = Number(summary.deal_count ?? 0);
  const owedRows = (owedData ?? []) as { balance: number }[];
  const outstanding = owedRows.reduce((s, r) => s + Number(r.balance), 0);
  const outstandingCount = owedRows.length;
  const avgDeal = dealCount > 0 ? Number(summary.total_size ?? 0) / dealCount : 0;
  const byCategory = (summary.by_category ?? []).map((c) => ({
    name: c.name,
    revenue: Number(c.revenue),
    count: Number(c.count),
  }));
  const maxCategoryRevenue = Math.max(1, ...byCategory.map((c) => c.revenue));

  const buildHref = (over: { month?: string; page?: number; view?: View }) => {
    const sp = new URLSearchParams();
    const v = over.view ?? view;
    if (v !== "closed") sp.set("view", v);
    if (service) sp.set("service", service);
    if (category) sp.set("category", category);
    if (agent) sp.set("agent", agent);
    const m = over.month ?? month;
    if (m !== currentMonth) sp.set("month", m);
    const p = over.page ?? 1;
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/sales?${s}` : "/sales";
  };
  const pageHref = (p: number) => buildHref({ page: p });
  const monthHref = (m: string) => buildHref({ month: m });
  const viewHref = (v: View) => buildHref({ view: v });

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
          + Log sale or payment
        </Link>
      }
    >
      <Card padded={false}>
        {/* Month stepper — defaults to the current month, step back for history. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <Link
            href={monthHref(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center font-mono text-[13px] tracking-[0.02em] text-[var(--text)]">
            {monthTitle(month)}
          </span>
          <Link
            href={monthHref(shiftMonth(month, 1))}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ›
          </Link>
          {month !== currentMonth && (
            <Link
              href={monthHref(currentMonth)}
              className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-amber-600 hover:underline"
            >
              This month
            </Link>
          )}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-4 px-5 py-4">
          {month !== currentMonth && (
            <input type="hidden" name="month" value={month} />
          )}
          {view !== "closed" && (
            <input type="hidden" name="view" value={view} />
          )}
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

          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              Filter
            </button>
            {hasFilters && (
              <Link href={monthHref(month)} className={btnSecondary}>
                Clear
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Readouts cols={4}>
        <Readout
          label={`Received this month${hasFilters ? " · filtered" : ""}`}
          value={fmtMoney(totalRevenue)}
        />
        <Readout
          label={`Deals closed${hasFilters ? " · filtered" : ""}`}
          value={dealCount}
        />
        <Readout label="Average deal size" value={fmtMoney(avgDeal)} />
        <Readout
          label={`Still owed · ${outstandingCount} sale${outstandingCount === 1 ? "" : "s"}`}
          value={fmtMoney(outstanding)}
        />
      </Readouts>

      {byCategory.length > 0 && (
        <Card
          title="Revenue by category"
          description="Money received this month, by kind of work."
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
                    className="h-full rounded-full bg-amber-600/80"
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

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["closed", "Sales closed"],
            ["payments", "Payments received"],
            ["unpaid", "Unpaid balances"],
          ] as [View, string][]
        ).map(([v, label]) => (
          <Link
            key={v}
            href={viewHref(v)}
            className={view === v ? pillActiveClass : pillClass}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card
        title={
          view === "payments"
            ? `${total} payment${total === 1 ? "" : "s"} in ${monthTitle(month)}`
            : view === "unpaid"
              ? `${total} sale${total === 1 ? "" : "s"} with money still owed`
              : `${total} deal${total === 1 ? "" : "s"}${hasFilters ? " found" : ""}`
        }
        description={
          view === "payments"
            ? "Every payment that came in this month, whichever month the sale closed. This is what counts toward targets."
            : view === "unpaid"
              ? "Sales from November 2026 on. When the client pays the next part, use + Log sale or payment and pick their sale at the top."
              : undefined
        }
        padded={false}
      >
        {view === "payments" ? (
          payments.length === 0 ? (
            <EmptyState
              emoji="💵"
              title={`No payments in ${monthTitle(month)}`}
              hint="Payments appear here as they're recorded on a sale."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Paid on</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Sale</th>
                    <th className="px-5 py-3 font-semibold">Sale closed</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 font-semibold">Note</th>
                    {floor && <th className="px-5 py-3 font-semibold">Agent</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-[var(--text-muted)]">
                        {p.paid_on}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {p.deal ? (
                          <Link
                            href={`/sales/${p.deal.id}`}
                            className="font-semibold text-[var(--text)] hover:underline"
                          >
                            {p.deal.client_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-[var(--text)]">
                        {fmtMoney(Number(p.amount))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[var(--text-muted)]">
                        {p.deal ? fmtMoney(Number(p.deal.deal_size)) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[var(--text-muted)]">
                        {p.deal?.date_closed ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[var(--text-muted)]">
                        {p.payment_method ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-muted)]">
                        {p.note ?? "—"}
                      </td>
                      {floor && (
                        <td className="px-5 py-3.5">
                          {p.deal?.agent ? (
                            <span className="flex items-center gap-2 text-[var(--text-muted)]">
                              <Avatar
                                name={p.deal.agent.full_name}
                                src={p.deal.agent.avatar_url}
                                size={7}
                              />
                              {p.deal.agent.full_name}
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
          )
        ) : deals.length === 0 ? (
          view === "unpaid" ? (
            <EmptyState
              emoji="✅"
              title="Nothing owed"
              hint="Every sale here is paid in full."
            />
          ) : (
          <EmptyState
            emoji={hasFilters ? "🔍" : "💰"}
            title={
              hasFilters
                ? "Nothing matches these filters"
                : `No deals in ${monthTitle(month)}`
            }
            hint={
              hasFilters
                ? "Try clearing a filter or picking another month."
                : month === currentMonth
                  ? "Nothing closed yet this month. Log a deal and it counts toward revenue."
                  : "No deals were closed this month. Step to another month to look back."
            }
            actionHref={hasFilters || month !== currentMonth ? undefined : "/sales/new"}
            actionLabel={hasFilters || month !== currentMonth ? undefined : "+ Log deal"}
          />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Sale</th>
                  <th className="px-5 py-3 font-semibold">Received</th>
                  <th className="px-5 py-3 font-semibold">Remaining</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Merchant</th>
                  <th className="px-5 py-3 font-semibold">Lead source</th>
                  <th className="px-5 py-3 font-semibold">Conversation</th>
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
                        <span className="rounded-full bg-[var(--hover)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
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
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[var(--text)]">
                      {fmtMoney(Number(deal.revenue_received))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {remaining > 0 && deal.date_closed >= BALANCE_TRACKING_FROM
                        ? fmtMoney(remaining)
                        : "—"}
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
                      {deal.conversation ?? "—"}
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
