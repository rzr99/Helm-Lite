"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/dates";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/[$,\s]/g, "");
  const value = Number(raw);
  if (raw === "" || Number.isNaN(value) || value < 0) {
    throw new Error("The amount must be a plain number, like 45 or 45.50");
  }
  return value;
}

// Like money(), but allows a negative value (a bank balance can go below zero).
function signedMoney(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/[$,\s]/g, "");
  const value = Number(raw);
  if (raw === "" || Number.isNaN(value)) {
    throw new Error("Enter a plain number, like 250000 or -5000.");
  }
  return value;
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const values = {
    category: text(formData, "category") || "others",
    description: text(formData, "description"),
    amount: money(formData, "amount"),
    date: text(formData, "date") || todayStr(),
  };

  if (!values.description) throw new Error("Give the item a name.");

  const { error } = await supabase.from("expenses").insert(values);

  if (error) throw new Error("Could not save the expense: " + error.message);

  revalidatePath("/expenses");
  // Reopen the section (and stay on the right month) after adding.
  redirect(
    `/expenses?month=${values.date.slice(0, 7)}&open=${encodeURIComponent(
      values.category
    )}`
  );
}

export async function setMonthlyClosing(month: string, formData: FormData) {
  const supabase = await createClient();

  const closing = money(formData, "closing");

  const { error } = await supabase
    .from("monthly_finances")
    .upsert({ month, closing });

  if (error) throw new Error("Could not save the closing: " + error.message);

  revalidatePath("/expenses");
}

// Correct the running bank balance to a real figure. We don't store the balance
// itself (it's derived); instead we save the difference between the number the
// owner typed and what the carry-forward currently computes, as this month's
// `adjustment`. That correction then rides along in every later month too.
export async function setBankBalance(month: string, formData: FormData) {
  const supabase = await createClient();

  const target = signedMoney(formData, "balance");

  // First day of the month AFTER the one being viewed (exclusive spend cutoff).
  const [y, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

  const [{ data: fins }, { data: spend }] = await Promise.all([
    supabase
      .from("monthly_finances")
      .select("month, closing, adjustment")
      .lte("month", month),
    supabase.from("expenses").select("amount").lt("date", end),
  ]);

  const rows = (fins ?? []) as {
    month: string;
    closing: number | null;
    adjustment: number | null;
  }[];
  const cumIn = rows.reduce((s, r) => s + Number(r.closing ?? 0), 0);
  // Every prior correction except this month's — we're about to overwrite it.
  const cumAdjustExclThis = rows
    .filter((r) => r.month !== month)
    .reduce((s, r) => s + Number(r.adjustment ?? 0), 0);
  const cumOut = ((spend ?? []) as { amount: number }[]).reduce(
    (s, e) => s + Number(e.amount),
    0
  );

  const base = cumIn - cumOut + cumAdjustExclThis;
  const adjustment = target - base;
  const thisClosing = Number(rows.find((r) => r.month === month)?.closing ?? 0);

  const { error } = await supabase
    .from("monthly_finances")
    .upsert({ month, closing: thisClosing, adjustment });

  if (error) throw new Error("Could not save the balance: " + error.message);

  revalidatePath("/expenses");
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    category: text(formData, "category") || "others",
    description: text(formData, "description"),
    amount: money(formData, "amount"),
    date: text(formData, "date") || todayStr(),
  };

  if (!values.description) throw new Error("Give the item a name.");

  const { error } = await supabase
    .from("expenses")
    .update(values)
    .eq("id", expenseId);

  if (error) throw new Error("Could not update the expense: " + error.message);

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) throw new Error("Could not delete the expense: " + error.message);

  revalidatePath("/expenses");
  redirect("/expenses");
}
