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

// Log a payment received (a Linear LLC payout, etc.). They accumulate into the
// month's income and lift the live bank balance.
export async function addIncome(formData: FormData) {
  const supabase = await createClient();

  const values = {
    source: text(formData, "source"),
    amount: money(formData, "amount"),
    date: text(formData, "date") || todayStr(),
  };

  const { error } = await supabase.from("income").insert(values);

  if (error) throw new Error("Could not save the payment: " + error.message);

  revalidatePath("/expenses");
  redirect(`/expenses?month=${values.date.slice(0, 7)}`);
}

export async function deleteIncome(incomeId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("income").delete().eq("id", incomeId);

  if (error) throw new Error("Could not delete the payment: " + error.message);

  revalidatePath("/expenses");
}

// Set the bank balance to a real figure. The balance itself is derived
// (baseline + all income − all expenses), so we store the baseline that makes
// today's balance equal the number the owner typed. From then on it moves live
// as receipts and expenses are logged, and can be re-set at any time.
export async function setBankBalance(formData: FormData) {
  const supabase = await createClient();

  const target = signedMoney(formData, "balance");

  const [{ data: inc }, { data: exp }] = await Promise.all([
    supabase.from("income").select("amount").limit(100000),
    supabase.from("expenses").select("amount").limit(100000),
  ]);

  const totalIn = ((inc ?? []) as { amount: number }[]).reduce(
    (s, r) => s + Number(r.amount),
    0
  );
  const totalOut = ((exp ?? []) as { amount: number }[]).reduce(
    (s, r) => s + Number(r.amount),
    0
  );

  const baseline = target - totalIn + totalOut;

  const { error } = await supabase
    .from("finance_settings")
    .upsert({ id: true, bank_baseline: baseline });

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
