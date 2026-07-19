import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { EXPENSE_CATEGORIES, fmtPKR } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { createExpense, setMonthlyClosing } from "@/app/expenses/actions";

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
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { month: rawMonth } = await searchParams;
  const month =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
      ? rawMonth
      : todayStr().slice(0, 7);
  const start = `${month}-01`;
  const end = `${shiftMonth(month, 1)}-01`;

  const [{ data }, { data: finance }] = await Promise.all([
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
  ]);

  const expenses = (data ?? []) as ExpenseRow[];
  const spending = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const closing = Number(finance?.closing ?? 0);
  const balance = closing - spending;

  const saveClosing = setMonthlyClosing.bind(null, month);

  const sections = EXPENSE_CATEGORIES.map((c) => {
    const items = expenses.filter((e) => e.category === c.value);
    return {
      ...c,
      items,
      total: items.reduce((sum, e) => sum + Number(e.amount), 0),
    };
  });
  // Anything in an old/unknown category still shows up rather than hiding.
  const known = new Set(EXPENSE_CATEGORIES.map((c) => c.value as string));
  const strays = expenses.filter((e) => !known.has(e.category));

  return (
    <Shell
      profile={profile}
      active="expenses"
      title="Expenses"
      subtitle="Owner-only. Mirrors your spending sheet: sections, monthly spending, closing, and balance."
    >
      <Card padded>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/expenses?month=${shiftMonth(month, -1)}`}
              className={btnSecondary}
            >
              ‹
            </Link>
            <span className="min-w-36 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {monthTitle(month)}
            </span>
            <Link
              href={`/expenses?month=${shiftMonth(month, 1)}`}
              className={btnSecondary}
            >
              ›
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Spending
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {fmtPKR(spending)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Closing
              </p>
              <form action={saveClosing} className="flex items-center gap-2">
                <input
                  name="closing"
                  inputMode="numeric"
                  defaultValue={closing || ""}
                  placeholder="0"
                  className={inputClass + " max-w-36 text-right font-semibold"}
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Save
                </button>
              </form>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Balance
              </p>
              <p
                className={
                  "text-2xl font-bold " +
                  (balance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400")
                }
              >
                {fmtPKR(balance)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Spending" padded={false}>
        {sections.map((s) => (
          <div key={s.value}>
            <div className="flex items-center justify-between border-b border-t border-zinc-100 bg-zinc-50/80 px-5 py-2 first:border-t-0 dark:border-zinc-800 dark:bg-zinc-800/60">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                {s.label}
                <span className="ml-2 font-medium normal-case text-zinc-400">
                  {s.items.length} item{s.items.length === 1 ? "" : "s"}
                </span>
              </p>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {fmtPKR(s.total)}
              </p>
            </div>
            {s.items.length === 0 ? (
              <p className="px-5 py-2.5 text-sm text-zinc-400 dark:text-zinc-500">
                — nothing this month
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {s.items.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {e.description || "(unnamed)"}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {e.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {fmtPKR(Number(e.amount))}
                      </span>
                      <Link
                        href={`/expenses/${e.id}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {strays.length > 0 && (
          <div>
            <div className="flex items-center justify-between border-t border-zinc-100 bg-amber-50/70 px-5 py-2 dark:border-zinc-800 dark:bg-amber-950/30">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Uncategorized
              </p>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {strays.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {e.description || "(unnamed)"}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{fmtPKR(Number(e.amount))}</span>
                    <Link
                      href={`/expenses/${e.id}`}
                      className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          action={createExpense}
          className="flex flex-wrap items-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40"
        >
          <div className="min-w-48 flex-1">
            <label className={labelClass}>
              Item <span className="text-red-500">*</span>
            </label>
            <input
              name="description"
              required
              placeholder="e.g. X premium - Ethan Cole"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Section</label>
            <select
              name="category"
              defaultValue="subscription"
              className={inputClass}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Amount (Rs) <span className="text-red-500">*</span>
            </label>
            <input
              name="amount"
              required
              inputMode="numeric"
              placeholder="1500"
              className={inputClass + " max-w-32"}
            />
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              name="date"
              defaultValue={todayStr()}
              className={inputClass}
            />
          </div>
          <button type="submit" className={btnPrimary}>
            Add
          </button>
        </form>
      </Card>
    </Shell>
  );
}
