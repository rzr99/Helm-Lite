import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { EXPENSE_CATEGORIES, fmtPKR } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { createExpense, setMonthlyClosing } from "@/app/expenses/actions";

export const dynamic = "force-dynamic";

const eyebrow =
  "font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]";
const bigMoney =
  "mt-3 font-mono text-[25px] font-medium tabular-nums tracking-tight text-[var(--text)]";
const statCard =
  "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5";

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

type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; open?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { month: rawMonth, open: openSection } = await searchParams;
  const currentMonth = todayStr().slice(0, 7);
  const month =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : currentMonth;
  const start = `${month}-01`;
  const end = `${shiftMonth(month, 1)}-01`;
  const addDate = month === currentMonth ? todayStr() : `${month}-01`;

  const [{ data }, { data: finance }, { data: pastFinances }, { data: pastSpend }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("id, category, description, amount, date")
        .gte("date", start)
        .lt("date", end)
        .order("date")
        .order("created_at"),
      supabase
        .from("monthly_finances")
        .select("closing")
        .eq("month", month)
        .maybeSingle(),
      // Every month up to and including this one — for the running bank balance.
      supabase.from("monthly_finances").select("closing").lte("month", month),
      supabase.from("expenses").select("amount").lt("date", end),
    ]);

  const expenses = (data ?? []) as ExpenseRow[];
  const spending = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const closing = Number(finance?.closing ?? 0);
  const balance = closing - spending;

  // Running bank balance: cumulative net (closing − spending) across every month
  // through the one being viewed. Σ(closing) − Σ(spending) over months ≤ current.
  const cumIn = ((pastFinances ?? []) as { closing: number }[]).reduce(
    (s, r) => s + Number(r.closing),
    0
  );
  const cumOut = ((pastSpend ?? []) as { amount: number }[]).reduce(
    (s, e) => s + Number(e.amount),
    0
  );
  const bankBalance = cumIn - cumOut;

  const saveClosing = setMonthlyClosing.bind(null, month);

  const known = new Set(EXPENSE_CATEGORIES.map((c) => c.value as string));
  const sections = [
    ...EXPENSE_CATEGORIES.map((c) => ({
      value: c.value as string,
      label: c.label as string,
      items: expenses.filter((e) => e.category === c.value),
    })),
    {
      value: "",
      label: "Uncategorized",
      items: expenses.filter((e) => !known.has(e.category)),
    },
  ]
    .map((s) => ({
      ...s,
      total: s.items.reduce((sum, e) => sum + Number(e.amount), 0),
    }))
    .filter((s) => s.value !== "" || s.items.length > 0);

  const maxTotal = Math.max(1, ...sections.map((s) => s.total));

  return (
    <Shell
      profile={profile}
      active="expenses"
      title="Expenses"
      subtitle="Owner-only. Your spending sheet, live."
    >
      {/* Month stepper — defaults to the current month, step back for history. */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <Link
            href={`/expenses?month=${shiftMonth(month, -1)}`}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ‹
          </Link>
          <span className="min-w-40 text-center font-mono text-[13px] tracking-[0.02em] text-[var(--text)]">
            {monthTitle(month)}
          </span>
          <Link
            href={`/expenses?month=${shiftMonth(month, 1)}`}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            ›
          </Link>
          {month !== currentMonth && (
            <Link
              href="/expenses"
              className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-amber-600 hover:underline"
            >
              This month
            </Link>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className={statCard}>
          <p className={eyebrow}>Spending</p>
          <p className={bigMoney}>{fmtPKR(spending)}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {expenses.length} item{expenses.length === 1 ? "" : "s"} this month
          </p>
        </div>

        <div className={statCard}>
          <p className={eyebrow}>Closing balance</p>
          <p className={bigMoney}>{fmtPKR(closing)}</p>
          <form action={saveClosing} className="mt-3 flex items-center gap-2">
            <input
              name="closing"
              inputMode="numeric"
              placeholder="Set closing…"
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--sunken)] px-3 py-2 text-sm tabular-nums text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-[#14100b] transition-colors hover:bg-amber-500"
            >
              Save
            </button>
          </form>
        </div>

        <div className={statCard}>
          <p className={eyebrow}>Net this month</p>
          <p
            className={
              "mt-3 font-mono text-[25px] font-medium tabular-nums tracking-tight " +
              (balance < 0 ? "text-[var(--negative)]" : "text-[var(--text)]")
            }
          >
            {fmtPKR(balance)}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Closing minus spending
          </p>
        </div>

        <div
          className={
            statCard + " border-amber-600/40 bg-[var(--accent-soft)]"
          }
        >
          <p className={eyebrow}>Bank balance</p>
          <p
            className={
              "mt-3 font-mono text-[25px] font-medium tabular-nums tracking-tight " +
              (bankBalance < 0 ? "text-[var(--negative)]" : "text-[var(--text)]")
            }
          >
            {fmtPKR(bankBalance)}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Carried forward through {monthTitle(month)}
          </p>
        </div>
      </div>

      <Card
        title="By category"
        action={
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {sections.length} categor{sections.length === 1 ? "y" : "ies"}
          </span>
        }
        padded={false}
      >
        {sections.map((s) => (
          <details key={s.label} className="group" open={s.value === openSection}>
            <summary className="relative flex cursor-pointer list-none select-none items-center justify-between border-t border-[var(--border)] px-5 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--sunken)] [&::-webkit-details-marker]:hidden">
              <span className="pointer-events-none absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded bg-[var(--border)]">
                <span
                  className="block h-full bg-amber-600/80"
                  style={{ width: `${(s.total / maxTotal) * 100}%` }}
                />
              </span>
              <span className="flex items-baseline gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0 self-center text-[var(--text-faint)] transition-transform group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span className="text-[14.5px] text-[var(--text)]">{s.label}</span>
                <span className="font-mono text-[11.5px] tabular-nums text-[var(--text-faint)]">
                  {s.items.length}
                </span>
              </span>
              <span className="font-mono text-[13.5px] font-medium tabular-nums text-[var(--text-muted)]">
                {s.total > 0 ? fmtPKR(s.total) : "—"}
              </span>
            </summary>

            {s.items.map((e) => (
              <div
                key={e.id}
                className="group/item flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-5 py-2.5 transition-colors hover:bg-[var(--sunken)]"
              >
                <p className="min-w-0 truncate text-sm text-[var(--text)]">
                  {e.description || "(unnamed)"}
                  <span className="ml-2 font-mono text-xs text-[var(--text-faint)]">
                    {e.date.slice(8)}/{e.date.slice(5, 7)}
                  </span>
                </p>
                <p className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/expenses/${e.id}`}
                    className="text-xs font-medium text-amber-600 opacity-0 transition-opacity hover:underline group-hover/item:opacity-100"
                  >
                    edit
                  </Link>
                  <span className="font-mono text-sm tabular-nums text-[var(--text)]">
                    {Number(e.amount).toLocaleString("en-US")}
                  </span>
                </p>
              </div>
            ))}

            {s.value !== "" && (
              <form
                action={createExpense}
                className="flex items-center gap-2 border-t border-[var(--border-soft)] px-5 py-2"
              >
                <input type="hidden" name="category" value={s.value} />
                <input type="hidden" name="date" value={addDate} />
                <span className="text-[var(--text-faint)]">+</span>
                <input
                  name="description"
                  required
                  placeholder="Add item…"
                  className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                />
                <input
                  name="amount"
                  required
                  inputMode="numeric"
                  placeholder="0"
                  className="w-24 border-0 bg-transparent py-1 text-right font-mono text-sm tabular-nums text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                />
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-[var(--accent-soft)]"
                >
                  Add
                </button>
              </form>
            )}
          </details>
        ))}

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--sunken)] px-5 py-3.5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Total spending
          </p>
          <p className="font-mono text-[15px] font-medium tabular-nums text-[var(--text)]">
            {fmtPKR(spending)}
          </p>
        </div>
      </Card>

      <p className="text-center text-xs text-[var(--text-faint)]">
        Click a section to expand it, then type an item and hit Add. New items
        are dated to the month you&apos;re viewing ({monthTitle(month)}) — flip
        months with ‹ › to log a past one. Change the day later via edit.
      </p>
    </Shell>
  );
}
