import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnSecondary, inputClass } from "@/components/ui";
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

// Each sheet section gets its own color band.
const sectionStyle: Record<string, { band: string; text: string }> = {
  subscription: {
    band: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  others: {
    band: "bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700",
    text: "text-zinc-700 dark:text-zinc-300",
  },
  utilities: {
    band: "bg-sky-50 border-sky-100 dark:bg-sky-950/40 dark:border-sky-900",
    text: "text-sky-700 dark:text-sky-300",
  },
  production: {
    band: "bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900",
    text: "text-violet-700 dark:text-violet-300",
  },
  salary: {
    band: "bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
  extras: {
    band: "bg-pink-50 border-pink-100 dark:bg-pink-950/40 dark:border-pink-900",
    text: "text-pink-700 dark:text-pink-300",
  },
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; open?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { month: rawMonth, open: openSection } = await searchParams;
  const month =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
      ? rawMonth
      : todayStr().slice(0, 7);
  const start = `${month}-01`;
  const end = `${shiftMonth(month, 1)}-01`;
  // New items land in the month you're viewing (today if it's the current
  // month, otherwise the 1st of that month) — so you can log past months.
  const addDate =
    month === todayStr().slice(0, 7) ? todayStr() : `${month}-01`;

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

  return (
    <Shell
      profile={profile}
      active="expenses"
      title="Expenses"
      subtitle="Owner-only. Your spending sheet, live."
      action={
        <div className="flex items-center gap-1">
          <Link
            href={`/expenses?month=${shiftMonth(month, -1)}`}
            className={btnSecondary + " px-3"}
            aria-label="Previous month"
          >
            ‹
          </Link>
          <span className="min-w-32 text-center text-base font-bold text-zinc-900 dark:text-zinc-50">
            {monthTitle(month)}
          </span>
          <Link
            href={`/expenses?month=${shiftMonth(month, 1)}`}
            className={btnSecondary + " px-3"}
            aria-label="Next month"
          >
            ›
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 dark:border-red-950 dark:bg-red-950/30">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
            Spending
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-red-700 dark:text-red-300">
            {fmtPKR(spending)}
          </p>
          <p className="mt-1 text-xs text-red-600/70 dark:text-red-300/70">
            {expenses.length} item{expenses.length === 1 ? "" : "s"} this month
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Closing
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {fmtPKR(closing)}
          </p>
          <form action={saveClosing} className="mt-2 flex items-center gap-1.5">
            <input
              name="closing"
              inputMode="numeric"
              placeholder="update…"
              className="w-full rounded-lg border border-[#2a2a37] bg-[#101017] px-2.5 py-1.5 text-sm tabular-nums text-zinc-100 outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Set
            </button>
          </form>
        </div>

        <div
          className={
            "rounded-2xl border p-5 " +
            (balance >= 0
              ? "border-green-900 bg-green-950/30"
              : "border-red-200 bg-red-50/70 dark:border-red-950 dark:bg-red-950/30")
          }
        >
          <p
            className={
              "text-xs font-bold uppercase tracking-wide " +
              (balance >= 0
                ? "text-green-400"
                : "text-red-700 dark:text-red-300")
            }
          >
            Balance
          </p>
          <p
            className={
              "mt-1 text-3xl font-bold tabular-nums " +
              (balance >= 0
                ? "text-green-400"
                : "text-red-700 dark:text-red-300")
            }
          >
            {fmtPKR(balance)}
          </p>
          <p
            className={
              "mt-1 text-xs " +
              (balance >= 0
                ? "text-green-500/70"
                : "text-red-600/70 dark:text-red-300/70")
            }
          >
            closing − spending
          </p>
        </div>
      </div>

      <Card padded={false}>
        {sections.map((s) => (
          <details key={s.label} className="group" open={s.value === openSection}>
            <summary
              className={
                "flex cursor-pointer list-none select-none items-center justify-between border-b border-t px-5 py-2.5 first:border-t-0 [&::-webkit-details-marker]:hidden " +
                (sectionStyle[s.value]?.band ??
                  "bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700")
              }
            >
              <span className="flex items-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className={
                    "h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90 " +
                    (sectionStyle[s.value]?.text ?? "text-zinc-500")
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span
                  className={
                    "text-base font-extrabold uppercase tracking-widest " +
                    (sectionStyle[s.value]?.text ??
                      "text-zinc-700 dark:text-zinc-300")
                  }
                >
                  {s.label}
                </span>
                <span className="text-xs font-medium tabular-nums text-zinc-400">
                  {s.items.length}
                </span>
              </span>
              <span
                className={
                  "text-base font-bold tabular-nums " +
                  (sectionStyle[s.value]?.text ??
                    "text-zinc-900 dark:text-zinc-50")
                }
              >
                {s.total > 0 ? fmtPKR(s.total) : ""}
              </span>
            </summary>

            {s.items.map((e) => (
              <div
                key={e.id}
                className="group flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-2 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
              >
                <p className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">
                  {e.description || "(unnamed)"}
                  <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {e.date.slice(8)}·{e.date.slice(5, 7)}
                  </span>
                </p>
                <p className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/expenses/${e.id}`}
                    className="text-xs font-semibold text-violet-400 opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                  >
                    edit
                  </Link>
                  <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {Number(e.amount).toLocaleString("en-US")}
                  </span>
                </p>
              </div>
            ))}

            {s.value !== "" && (
              <form
                action={createExpense}
                className="flex items-center gap-2 border-b border-zinc-100 px-5 py-1.5 dark:border-zinc-800/60"
              >
                <input type="hidden" name="category" value={s.value} />
                <input type="hidden" name="date" value={addDate} />
                <span className="text-zinc-300 dark:text-zinc-600">+</span>
                <input
                  name="description"
                  required
                  placeholder="add item…"
                  className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-300 dark:text-zinc-200 dark:placeholder:text-zinc-600"
                />
                <input
                  name="amount"
                  required
                  inputMode="numeric"
                  placeholder="0"
                  className="w-24 border-0 bg-transparent py-1 text-right text-sm tabular-nums text-zinc-800 outline-none placeholder:text-zinc-300 dark:text-zinc-200 dark:placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-xs font-bold text-violet-400 hover:bg-violet-950/40"
                >
                  Add
                </button>
              </form>
            )}
          </details>
        ))}

        <div className="flex items-center justify-between bg-zinc-900 px-5 py-3 dark:bg-zinc-100">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-100 dark:text-zinc-900">
            Total spending
          </p>
          <p className="text-base font-bold tabular-nums text-white dark:text-zinc-900">
            {fmtPKR(spending)}
          </p>
        </div>
      </Card>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        Click a section to expand it, then type an item and hit Add. New items
        are dated to the month you're viewing ({monthTitle(month)}) — flip
        months with ‹ › to log a past one. Change the day later via edit.
      </p>
    </Shell>
  );
}
