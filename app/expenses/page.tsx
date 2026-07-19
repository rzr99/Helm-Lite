import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  fmtMoney,
} from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { createExpense } from "@/app/expenses/actions";

export const dynamic = "force-dynamic";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

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

  const { data } = await supabase
    .from("expenses")
    .select("id, category, description, amount, date")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const expenses = data ?? [];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = EXPENSE_CATEGORIES.map((c) => {
    const theirs = expenses.filter((e) => e.category === c.value);
    return {
      ...c,
      total: theirs.reduce((sum, e) => sum + Number(e.amount), 0),
      count: theirs.length,
    };
  }).filter((c) => c.count > 0);
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <Shell
      profile={profile}
      active="expenses"
      title="Expenses"
      subtitle="Owner-only. What it costs to run the operation, month by month."
    >
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Month total{" "}
            <span className="ml-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {fmtMoney(total)}
            </span>
          </p>
        </div>
      </Card>

      {byCategory.length > 0 && (
        <Card title="By category" description="Where the money went this month.">
          <ul className="flex flex-col gap-4">
            {byCategory.map((c) => (
              <li key={c.value}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {c.label}
                    <span className="ml-2 text-xs text-zinc-400">
                      {c.count} item{c.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {fmtMoney(c.total)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-red-400"
                    style={{
                      width: `${Math.round((c.total / maxCategory) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title={`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`}
        padded={false}
      >
        {expenses.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Nothing logged this month"
            hint="Add proxies, VCCs, subscriptions — anything the operation pays for — with the form below."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {e.date}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {expenseCategoryLabel(e.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {e.description || "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-red-600 dark:text-red-400">
                      {fmtMoney(Number(e.amount))}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/expenses/${e.id}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          action={createExpense}
          className="flex flex-wrap items-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40"
        >
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              name="date"
              defaultValue={todayStr()}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select name="category" defaultValue="other" className={inputClass}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-48 flex-1">
            <label className={labelClass}>Description</label>
            <input
              name="description"
              placeholder="What was it for?"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="45"
              className={inputClass + " max-w-28"}
            />
          </div>
          <button type="submit" className={btnPrimary}>
            Add expense
          </button>
        </form>
      </Card>
    </Shell>
  );
}
