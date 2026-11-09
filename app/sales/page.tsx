import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  Card,
  Readouts,
  Readout,
  btnPrimary,
  inputClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { fmtMoney } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { addPayment, closeSale } from "@/app/sales/actions";

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
  pay_status: "open" | "lost" | "settled";
  lost_amount: number;
  closed_on: string | null;
  close_note: string | null;
  date_closed: string;
  payment_method: string | null;
  merchant_name: string | null;
  social_platform: string | null;
  agent: { full_name: string } | null;
};

type Payment = {
  id: string;
  deal_id: string;
  amount: number;
  paid_on: string;
  payment_method: string | null;
};

const SALE_FIELDS =
  "id, agent_id, client_name, service, deal_size, revenue_received, pay_status, lost_amount, closed_on, close_note, date_closed, payment_method, merchant_name, social_platform, agent:users(full_name)";

const th =
  "whitespace-nowrap px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]";
const td = "whitespace-nowrap px-3 py-2.5 text-[13px] text-[var(--text-muted)]";
const tdNum =
  "whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] tabular-nums";

function left(d: Sale) {
  return d.pay_status === "open"
    ? Math.max(0, Number(d.deal_size) - Number(d.revenue_received))
    : 0;
}

// Remaining column: amount left, Paid ✓, Lost $X, or Closed.
function RemainingCell({ d }: { d: Sale }) {
  if (d.pay_status === "lost")
    return (
      <span className="text-[var(--negative)]">
        Lost {fmtMoney(Number(d.lost_amount))}
      </span>
    );
  if (d.pay_status === "settled")
    return <span className="text-[var(--text-faint)]">Closed</span>;
  const l = left(d);
  return l > 0 ? (
    <span className="font-semibold text-[var(--text)]">{fmtMoney(l)}</span>
  ) : (
    <span className="text-[var(--text-faint)]">Paid ✓</span>
  );
}

// "+ Payment" opens a small form right in the row; the payment updates this
// same sale. Also links to closing it as not paid.
function PaymentButton({ d }: { d: Sale }) {
  const l = left(d);
  const record = addPayment.bind(null, d.id);
  const markLost = closeSale.bind(null, d.id);
  return (
    <details>
      <summary className="cursor-pointer list-none rounded-md border border-amber-600/50 px-2.5 py-1 text-center text-xs font-medium text-amber-600 hover:bg-[var(--accent-soft)] [&::-webkit-details-marker]:hidden">
        + Payment
      </summary>
      <form action={record} className="mt-2 flex w-52 flex-col gap-2">
        <input
          name="amount"
          required
          inputMode="decimal"
          defaultValue={String(l)}
          aria-label="Amount paid"
          className={inputClass + " py-1.5"}
        />
        <input
          type="date"
          name="paid_on"
          defaultValue={todayStr()}
          aria-label="Date paid"
          className={inputClass + " py-1.5"}
        />
        <button type="submit" className={btnPrimary + " py-1.5"}>
          Save payment
        </button>
      </form>
      <form
        action={markLost}
        className="mt-3 flex w-52 flex-col gap-2 border-t border-[var(--border)] pt-3"
      >
        <input type="hidden" name="reason" value="lost" />
        <p className="text-[11px] text-[var(--text-faint)]">
          Client won&apos;t pay the rest?
        </p>
        <input
          name="note"
          placeholder="Reason (optional)"
          aria-label="Reason"
          className={inputClass + " py-1.5"}
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--negative)]/50 px-3 py-1.5 text-xs font-medium text-[var(--negative)] hover:bg-[var(--hover)]"
        >
          Mark {fmtMoney(l)} as lost
        </button>
      </form>
    </details>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; agent?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const isOwner = profile.role === "owner";
  const { month: monthRaw, agent: agentRaw } = await searchParams;
  const agent = floor ? agentRaw || "" : "";

  const currentMonth = todayStr().slice(0, 7);
  const month =
    monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : currentMonth;
  const monthStart = `${month}-01`;
  const nextMonthStart = `${shiftMonth(month, 1)}-01`;

  const canPayOn = (d: Sale) =>
    d.pay_status === "open" &&
    left(d) > 0 &&
    (isOwner || d.agent_id === profile.id);

  let paymentsQ = supabase
    .from("deal_payments")
    .select("id, deal_id, amount, paid_on, payment_method")
    .gte("paid_on", monthStart)
    .lt("paid_on", nextMonthStart)
    .order("paid_on")
    .limit(5000);
  if (agent) paymentsQ = paymentsQ.eq("agent_id", agent);

  let closedQ = supabase
    .from("deals")
    .select(SALE_FIELDS)
    .gte("date_closed", monthStart)
    .lt("date_closed", nextMonthStart)
    .limit(5000);
  if (agent) closedQ = closedQ.eq("agent_id", agent);

  let openQ = supabase
    .from("deals")
    .select(SALE_FIELDS)
    .eq("pay_status", "open")
    .gt("balance", 0)
    .order("date_closed", { ascending: false })
    .limit(5000);
  if (agent) openQ = openQ.eq("agent_id", agent);

  let lostQ = supabase
    .from("deals")
    .select(SALE_FIELDS)
    .eq("pay_status", "lost")
    .gte("closed_on", monthStart)
    .lt("closed_on", nextMonthStart)
    .order("closed_on", { ascending: false })
    .limit(5000);
  if (agent) lostQ = lostQ.eq("agent_id", agent);

  const none = Promise.resolve({ data: [] as unknown[] });
  const [
    { data: payData },
    { data: closedData },
    { data: openData },
    { data: lostData },
    { data: teamData },
  ] = await Promise.all([
    paymentsQ,
    closedQ,
    openQ,
    lostQ,
    floor
      ? supabase
          .from("users")
          .select("id, full_name")
          .eq("active", true)
          .order("full_name")
      : none,
  ]);

  const payments = (payData ?? []) as Payment[];
  const closedInMonth = (closedData ?? []) as unknown as Sale[];
  const openSales = (openData ?? []) as unknown as Sale[];
  const lostInMonth = (lostData ?? []) as unknown as Sale[];
  const teammates = (teamData ?? []) as { id: string; full_name: string }[];

  // The month's sheet: every project that closed this month or had money come
  // in this month (an older project paying its next part shows up again here).
  const byId = new Map<string, Sale>();
  for (const d of closedInMonth) byId.set(d.id, d);
  const missing = [
    ...new Set(payments.map((p) => p.deal_id).filter((id) => !byId.has(id))),
  ];
  if (missing.length > 0) {
    const { data } = await supabase
      .from("deals")
      .select(SALE_FIELDS)
      .in("id", missing);
    for (const d of (data ?? []) as unknown as Sale[]) byId.set(d.id, d);
  }

  const receivedThisMonth = new Map<string, number>();
  const firstPaidThisMonth = new Map<string, string>();
  for (const p of payments) {
    receivedThisMonth.set(
      p.deal_id,
      (receivedThisMonth.get(p.deal_id) ?? 0) + Number(p.amount)
    );
    if (!firstPaidThisMonth.has(p.deal_id))
      firstPaidThisMonth.set(p.deal_id, p.paid_on);
  }

  const rowDate = (d: Sale) =>
    d.date_closed >= monthStart && d.date_closed < nextMonthStart
      ? d.date_closed
      : (firstPaidThisMonth.get(d.id) ?? d.date_closed);
  const rows = [...byId.values()].sort((a, b) =>
    rowDate(a).localeCompare(rowDate(b))
  );

  const monthSales = payments.reduce((s, p) => s + Number(p.amount), 0);
  const newValue = closedInMonth.reduce((s, d) => s + Number(d.deal_size), 0);
  const toCollect = openSales.reduce((s, d) => s + left(d), 0);
  const lostTotal = lostInMonth.reduce((s, d) => s + Number(d.lost_amount), 0);

  // Totals by payment method (like the bottom of the sheet).
  const methodTotals = new Map<string, { label: string; amount: number }>();
  for (const p of payments) {
    const label =
      p.payment_method?.trim() || byId.get(p.deal_id)?.payment_method?.trim() || "Other";
    const key = label.toLowerCase();
    const cur = methodTotals.get(key) ?? { label, amount: 0 };
    cur.amount += Number(p.amount);
    methodTotals.set(key, cur);
  }
  const methods = [...methodTotals.values()].sort((a, b) => b.amount - a.amount);

  const href = (m: string) => {
    const sp = new URLSearchParams();
    if (m !== currentMonth) sp.set("month", m);
    if (agent) sp.set("agent", agent);
    const q = sp.toString();
    return q ? `/sales?${q}` : "/sales";
  };

  return (
    <Shell
      profile={profile}
      active="sales"
      title="Sales"
      subtitle="A month's sales = the money received that month."
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
            href={href(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center font-mono text-[13px] tracking-[0.02em] text-[var(--text)]">
            {monthTitle(month)}
          </span>
          <Link
            href={href(shiftMonth(month, 1))}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ›
          </Link>
          {month !== currentMonth && (
            <Link
              href={href(currentMonth)}
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

      <Readouts cols={4}>
        <Readout label="Sales (received)" value={fmtMoney(monthSales)} />
        <Readout
          label={`New projects · ${closedInMonth.length}`}
          value={fmtMoney(newValue)}
        />
        <Readout label="Still to collect" value={fmtMoney(toCollect)} />
        <Readout label="Payment lost" value={fmtMoney(lostTotal)} />
      </Readouts>

      {/* The monthly sheet */}
      <Card
        title={`${monthTitle(month)} sheet`}
        description="Every project signed or paid this month. Received = paid this month; Received total = paid so far."
        padded={false}
      >
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">
            Nothing signed or paid in {monthTitle(month)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className={th}>Date</th>
                  {floor && <th className={th}>Agent</th>}
                  <th className={th}>Client</th>
                  <th className={th}>Service</th>
                  <th className={th + " text-right"}>Sale</th>
                  <th className={th + " text-right"}>Received</th>
                  <th className={th + " text-right"}>Received total</th>
                  <th className={th + " text-right"}>Remaining</th>
                  <th className={th}>Method</th>
                  <th className={th}>Merchant</th>
                  <th className={th}>Platform</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {rows.map((d) => {
                  const inMonth = receivedThisMonth.get(d.id) ?? 0;
                  const isNew =
                    d.date_closed >= monthStart && d.date_closed < nextMonthStart;
                  return (
                    <tr key={d.id} className="align-top hover:bg-[var(--sunken)]">
                      <td className={td + " font-mono text-[12px]"}>
                        {shortDate(rowDate(d))}
                      </td>
                      {floor && <td className={td}>{d.agent?.full_name ?? "—"}</td>}
                      <td className="px-3 py-2.5 text-[13px]">
                        <Link
                          href={`/sales/${d.id}`}
                          className="font-semibold text-[var(--text)] hover:underline"
                        >
                          {d.client_name}
                        </Link>
                        {!isNew && (
                          <p className="text-[11px] text-[var(--text-faint)]">
                            signed {shortDate(d.date_closed)}
                          </p>
                        )}
                      </td>
                      <td className={td}>{d.service ?? "—"}</td>
                      <td className={tdNum + " text-[var(--text-muted)]"}>
                        {fmtMoney(Number(d.deal_size))}
                      </td>
                      <td className={tdNum + " font-semibold text-[var(--text)]"}>
                        {inMonth > 0 ? fmtMoney(inMonth) : "—"}
                      </td>
                      <td className={tdNum + " text-[var(--text-muted)]"}>
                        {fmtMoney(Number(d.revenue_received))}
                      </td>
                      <td className={tdNum}>
                        <RemainingCell d={d} />
                      </td>
                      <td className={td}>{d.payment_method ?? "—"}</td>
                      <td className={td}>{d.merchant_name ?? "—"}</td>
                      <td className={td}>{d.social_platform ?? "—"}</td>
                      <td className="px-3 py-2">
                        {canPayOn(d) && <PaymentButton d={d} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] bg-[var(--sunken)]">
                  <td
                    colSpan={floor ? 5 : 4}
                    className="px-3 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  >
                    Total
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[15px] font-semibold tabular-nums text-[var(--text)]">
                    {fmtMoney(monthSales)}
                  </td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {methods.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] px-5 py-3.5">
            {methods.map((m) => (
              <p key={m.label} className="text-sm">
                <span className="text-[var(--text-faint)]">{m.label}</span>{" "}
                <span className="font-mono tabular-nums text-[var(--text)]">
                  {fmtMoney(m.amount)}
                </span>
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* Still to collect — every month */}
      <Card
        title={`Still to collect · ${openSales.length}`}
        description="Projects with money left, from any month. When the client pays, use + Payment."
        action={
          <span className="font-mono text-sm tabular-nums text-[var(--text)]">
            {fmtMoney(toCollect)}
          </span>
        }
        padded={false}
      >
        {openSales.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">
            Nothing left to collect. Every project is paid.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className={th}>Signed</th>
                  {floor && <th className={th}>Agent</th>}
                  <th className={th}>Client</th>
                  <th className={th}>Service</th>
                  <th className={th + " text-right"}>Sale</th>
                  <th className={th + " text-right"}>Received</th>
                  <th className={th + " text-right"}>Left</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {openSales.map((d) => (
                  <tr key={d.id} className="align-top hover:bg-[var(--sunken)]">
                    <td className={td + " font-mono text-[12px]"}>
                      {shortDate(d.date_closed)}
                    </td>
                    {floor && <td className={td}>{d.agent?.full_name ?? "—"}</td>}
                    <td className="px-3 py-2.5 text-[13px]">
                      <Link
                        href={`/sales/${d.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {d.client_name}
                      </Link>
                    </td>
                    <td className={td}>{d.service ?? "—"}</td>
                    <td className={tdNum + " text-[var(--text-muted)]"}>
                      {fmtMoney(Number(d.deal_size))}
                    </td>
                    <td className={tdNum + " text-[var(--text-muted)]"}>
                      {fmtMoney(Number(d.revenue_received))}
                    </td>
                    <td className={tdNum + " font-semibold text-[var(--text)]"}>
                      {fmtMoney(left(d))}
                    </td>
                    <td className="px-3 py-2">
                      {canPayOn(d) && <PaymentButton d={d} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment lost this month */}
      <Card
        title={`Payment lost · ${monthTitle(month)}`}
        description="Projects closed this month where the client didn't pay the rest."
        action={
          <span className="font-mono text-sm tabular-nums text-[var(--negative)]">
            {fmtMoney(lostTotal)}
          </span>
        }
        padded={false}
      >
        {lostInMonth.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--text-muted)]">
            No lost payments in {monthTitle(month)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className={th}>Closed</th>
                  {floor && <th className={th}>Agent</th>}
                  <th className={th}>Client</th>
                  <th className={th + " text-right"}>Sale</th>
                  <th className={th + " text-right"}>Received</th>
                  <th className={th + " text-right"}>Lost</th>
                  <th className={th}>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {lostInMonth.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--sunken)]">
                    <td className={td + " font-mono text-[12px]"}>
                      {d.closed_on ? shortDate(d.closed_on) : "—"}
                    </td>
                    {floor && <td className={td}>{d.agent?.full_name ?? "—"}</td>}
                    <td className="px-3 py-2.5 text-[13px]">
                      <Link
                        href={`/sales/${d.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {d.client_name}
                      </Link>
                    </td>
                    <td className={tdNum + " text-[var(--text-muted)]"}>
                      {fmtMoney(Number(d.deal_size))}
                    </td>
                    <td className={tdNum + " text-[var(--text-muted)]"}>
                      {fmtMoney(Number(d.revenue_received))}
                    </td>
                    <td className={tdNum + " font-semibold text-[var(--negative)]"}>
                      {fmtMoney(Number(d.lost_amount))}
                    </td>
                    <td className={td + " whitespace-normal"}>
                      {d.close_note ?? "—"}
                    </td>
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
