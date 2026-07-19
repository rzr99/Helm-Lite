import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { EXPENSE_CATEGORIES } from "@/lib/enums";
import { updateExpense, deleteExpense } from "@/app/expenses/actions";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: expense } = await supabase
    .from("expenses")
    .select("id, category, description, amount, date")
    .eq("id", id)
    .single();

  if (!expense) notFound();

  const saveExpense = updateExpense.bind(null, expense.id);
  const removeExpense = deleteExpense.bind(null, expense.id);

  return (
    <Shell
      profile={profile}
      active="expenses"
      title="Edit expense"
      subtitle={`Logged for ${expense.date}`}
      action={
        <Link
          href="/expenses"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to expenses
        </Link>
      }
    >
      <div className="max-w-xl">
        <Card padded>
          <form action={saveExpense} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={expense.date}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  name="category"
                  defaultValue={expense.category}
                  className={inputClass}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <input
                name="description"
                defaultValue={expense.description ?? ""}
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
                defaultValue={String(expense.amount)}
                className={inputClass + " max-w-40"}
              />
            </div>

            <button type="submit" className={btnPrimary + " self-start"}>
              Save changes
            </button>
          </form>
        </Card>

        <div className="mt-6">
          <Card
            title="Danger zone"
            description="Removes this expense from all totals. There is no undo."
          >
            <form action={removeExpense}>
              <button
                type="submit"
                className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete this expense
              </button>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
