import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Readouts,
  Readout,
  btnPrimary,
  pillClass,
  pillActiveClass,
  inputClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { fmtMoney } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { BALANCE_TRACKING_FROM } from "@/lib/sales";
import { addPayment } from "@/app/sales/actions";

export const dynamic = "force-dynamic";

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
function shortDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

type Sale = {
  id: string;
  agent_id: string;
  client_name: string;
  service: string | null;
  deal_size: number;
  revenue_received: number;
  date_closed: string;
  agent: { full_name: string; avatar_url: string | null } | null;
};

type Payment = {
  id: string;
  amount: number;
  paid_on: string;
  deal: {
    id: string;
    client_name: string;
    service_category: string | null;
    deal_size: number;
    agent: { full_name: string } | null;
  } | null;
};

const SALE_FIELDS =
  "id, agent_id, client_name, service, deal_size, revenue_received, date_closed, agent:users(full_name, avatar_url)";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; agent?: string; show?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const isOwner = profile.role === "owner";
  const { month: monthRaw, agent: agentRaw, show } = await searchParams;
  const agent = floor ? agentRaw || "" : "";
  // Projects list: everything still owed (any month), or the month's new sales.
  const listMode: "open" | "month" = show === "month" ? "month" : "open";

  const currentMonth = todayStr().slice(0, 7);
  const month =
    monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : currentMonth;
  const monthStart = `${month}-01`;
  const nextMonthStart = `${shiftMonth(month, 1)}-01`;

  let paymentsQ = supabase
    .from("deal_payments")
    .select(
      "id, amount, paid_on, deal:deals!inner(id, client_name, service_category, deal_size, agent:users(full_name))"
    )
    .gte("paid_on", monthStart)
    .lt("paid_on", nextMonthStart)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (agent) paymentsQ = paymentsQ.eq("agent_id", agent);

  let newSalesQ = supabase
    .from("deals")
    .select(SALE_FIELDS)
    .gte("date_closed", monthStart)
    .lt("date_closed", nextMonthStart)
    .order("date_closed", { ascending: false })
    .limit(5000);
  if (agent) newSalesQ = newSalesQ.eq("agent_id", agent);

  // Older sales were logged once per instalment, so only sales from
  // BALANCE_TRACKING_FROM on have a real "left to pay".
  let openQ = supabase
    .from("deals")
    .select(SALE_FIELDS)
    .gt("balance", 0)
    .gte("date_closed", BALANCE_TRACKING_FROM)
    .order("date_closed", { ascending: false })
    .limit(5000);
  if (agent) openQ = openQ.eq("agent_id", agent);

  const none = Promise.resolve({ data: [] as unknown[] });
  const [
    { data: payData },
    { data: newData },
    { data: openData },
    { data: teamData },
    { data: allPaidData },
  ] = await Promise.all([
    paymentsQ,
    newSalesQ,
    openQ,
    floor
      ? supabase
          .from("users")
          .select("id, full_name")
          .eq("active", true)
          .order("full_name")
      : none,
    isOwner
      ? supabase.from("deal_payments").select("amount").limit(100000)
      : none,
  ]);

  const payments = (payData ?? []) as unknown as Payment[];
  const newSales = (newData ?? []) as unknown as Sale[];
  const openSales = (openData ?? []) as unknown as Sale[];
  const teammates = (teamData ?? []) as { id: string; full_name: string }[];

  const monthSales = payments.reduce((s, p) => s + Number(p.amount), 0);
  const newSalesValue = newSales.reduce((s, d) => s + Number(d.deal_size), 0);
  const toCollect = openSales.reduce(
    (s, d) => s + (Number(d.deal_size) - Number(d.revenue_received)),
    0
  );
  const tillDate = ((allPaidData ?? []) as { amount: number }[]).reduce(
    (s, r) => s + Number(r.amount),
    0
  );

  // Money in by kind of work (optional breakdown).
  const byCategory = new Map<string, number>();
  for (const p of payments) {
    const c = p.deal?.service_category || "Uncategorized";
    byCategory.set(c, (byCategory.get(c) ?? 0) + Number(p.amount));
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const href = (over: { month?: string; show?: string }) => {
    const sp = new URLSearchParams();
    const m = over.month ?? month;
    if (m !== currentMonth) sp.set("month", m);
    if (agent) sp.set("agent", agent);
    const s = over.show ?? (listMode === "month" ? "month" : "");
    if (s) sp.set("show", s);
    const q = sp.toString();
    return q ? `/sales?${q}` : "/sales";
  };

  const list = listMode === "open" ? openSales : newSales;
  const today = todayStr();

  return (
    <Shell
      profile={profile}
      active="sales"
      title="Sales"
      subtitle={
        floor
          ? "Each project once. A sale counts in the month its money arrives."
          : "Your projects. A sale counts in the month its money arrives."
      }
      action={
        <Link href="/sales/new" className={btnPrimary}>
          + New sale
        </Link>
      }
    >
      {/* Month + agent */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Link
            href={href({ month: shiftMonth(month, -1) })}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center font-mono text-[13px] tracking-[0.02em] text-[var(--text)]">
            {monthTitle(month)}
          </span>
          <Link
            href={href({ month: shiftMonth(month, 1) })}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ›
          </Link>
          {month !== currentMonth && (
            <Link
              href={href({ month: currentMonth })}
              className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-amber-600 hover:underline"
            >
              This month
            </Link>
          )}

          {floor && (
            <form method="get" className="ml-auto flex items-center gap-2">
              {month !== currentMonth && (
                <input type="hidden" name="month" value={month} />
              )}
              {listMode === "month" && (
                <input type="hidden" name="show" value="month" />
              )}
              <select
                name="agent"
                defaultValue={agent}
                className={inputClass + " py-1.5"}
              >
                <option value="">All agents</option>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--hover)]"
              >
                Show
              </button>
            </form>
          )}
        </div>
      </Card>

      <Readouts cols={3}>
        <Readout
          label={`Sales · ${monthTitle(month)}`}
          value={fmtMoney(monthSales)}
        />
        <Readout
          label={`New projects · ${newSales.length}`}
          value={fmtMoney(newSalesValue)}
        />
        <Readout
          label={`Still to collect · ${openSales.length}`}
          value={fmtMoney(toCollect)}
        />
      </Readouts>
      <p className="-mt-2 text-xs text-[var(--text-faint)]">
        <span className="text-[var(--text-muted)]">Sales</span> = money received
        in {monthTitle(month)}, from any project.{" "}
        <span className="text-[var(--text-muted)]">New projects</span> = sales
        closed this month (full value).{" "}
        <span className="text-[var(--text-muted)]">Still to collect</span> = what
        clients still owe, all months.
        {isOwner && (
          <>
            {" "}
            Received till date (all agents):{" "}
            <span className="font-mono text-[var(--text)]">
              {fmtMoney(tillDate)}
            </span>
          </>
        )}
      </p>

      {/* Projects */}
      <Card
        title="Projects"
        clip={false}
        action={
          <div className="flex gap-2">
            <Link
              href={href({ show: "" })}
              className={listMode === "open" ? pillActiveClass : pillClass}
            >
              Still owed
            </Link>
            <Link
              href={href({ show: "month" })}
              className={listMode === "month" ? pillActiveClass : pillClass}
            >
              New in {monthTitle(month).split(" ")[0]}
            </Link>
          </div>
        }
        padded={false}
      >
        {list.length === 0 ? (
          <EmptyState
            emoji={listMode === "open" ? "✅" : "💰"}
            title={
              listMode === "open"
                ? "Nothing left to collect"
                : `No new projects in ${monthTitle(month)}`
            }
            hint={
              listMode === "open"
                ? "Every project is paid in full."
                : "Use + New sale when a client signs."
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {list.map((d) => {
              const total = Number(d.deal_size);
              const paid = Number(d.revenue_received);
              const tracked = d.date_closed >= BALANCE_TRACKING_FROM;
              const left = tracked ? Math.max(0, total - paid) : 0;
              const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 100;
              const canPay =
                tracked &&
                left > 0 &&
                (isOwner || d.agent_id === profile.id);
              const recordPayment = addPayment.bind(null, d.id);
              return (
                <li key={d.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="min-w-44 flex-1">
                      <Link
                        href={`/sales/${d.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {d.client_name}
                      </Link>
                      <p className="text-xs text-[var(--text-faint)]">
                        {d.service ? `${d.service} · ` : ""}
                        {shortDate(d.date_closed)}
                        {floor && d.agent ? ` · ${d.agent.full_name}` : ""}
                      </p>
                    </div>

                    <div className="w-48">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-amber-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] tabular-nums text-[var(--text-muted)]">
                        {fmtMoney(paid)} of {fmtMoney(total)}
                      </p>
                    </div>

                    <div className="w-28 text-right">
                      {!tracked ? (
                        <span className="text-xs text-[var(--text-faint)]">—</span>
                      ) : left > 0 ? (
                        <>
                          <p className="font-mono text-[14px] font-semibold tabular-nums text-[var(--text)]">
                            {fmtMoney(left)}
                          </p>
                          <p className="text-[11px] text-[var(--text-faint)]">
                            left
                          </p>
                        </>
                      ) : (
                        <span className="rounded-full bg-[var(--hover)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                          Paid ✓
                        </span>
                      )}
                    </div>

                    <div className="w-28 text-right">
                      {canPay && (
                        <details className="group relative">
                          <summary className="cursor-pointer list-none rounded-lg border border-amber-600/50 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-[var(--accent-soft)] [&::-webkit-details-marker]:hidden">
                            + Payment
                          </summary>
                          <form
                            action={recordPayment}
                            className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-left shadow-lg"
                          >
                            <label className="text-xs text-[var(--text-muted)]">
                              Amount paid ($)
                              <input
                                name="amount"
                                required
                                inputMode="decimal"
                                defaultValue={String(left)}
                                className={inputClass + " mt-1"}
                              />
                            </label>
                            <label className="text-xs text-[var(--text-muted)]">
                              Date paid
                              <input
                                type="date"
                                name="paid_on"
                                defaultValue={today}
                                className={inputClass + " mt-1"}
                              />
                            </label>
                            <button type="submit" className={btnPrimary}>
                              Save payment
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* The month's sales = the payments that came in */}
      <Card
        title={`Sales in ${monthTitle(month)}`}
        description="Every payment received this month. These add up to the month's sales."
        action={
          <span className="font-mono text-sm tabular-nums text-[var(--text)]">
            {fmtMoney(monthSales)}
          </span>
        }
        padded={false}
      >
        {payments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--text-muted)]">
            No money received in {monthTitle(month)} yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <p className="min-w-0 truncate">
                  <span className="mr-3 font-mono text-xs text-[var(--text-faint)]">
                    {shortDate(p.paid_on)}
                  </span>
                  {p.deal ? (
                    <Link
                      href={`/sales/${p.deal.id}`}
                      className="text-[var(--text)] hover:underline"
                    >
                      {p.deal.client_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  <span className="ml-2 text-xs text-[var(--text-faint)]">
                    {p.deal ? `of ${fmtMoney(Number(p.deal.deal_size))}` : ""}
                    {floor && p.deal?.agent ? ` · ${p.deal.agent.full_name}` : ""}
                  </span>
                </p>
                <span className="shrink-0 font-mono font-semibold tabular-nums text-[var(--text)]">
                  {fmtMoney(Number(p.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}

        {categories.length > 0 && (
          <details className="border-t border-[var(--border)]">
            <summary className="cursor-pointer list-none px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-faint)] hover:text-[var(--text-muted)] [&::-webkit-details-marker]:hidden">
              Breakdown by kind of work ▾
            </summary>
            <ul className="flex flex-col gap-2 px-5 pb-4">
              {categories.map(([name, amount]) => (
                <li key={name} className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{name}</span>
                  <span className="font-mono tabular-nums text-[var(--text)]">
                    {fmtMoney(amount)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

    </Shell>
  );
}
