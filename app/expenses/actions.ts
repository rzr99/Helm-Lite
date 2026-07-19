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

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const values = {
    category: text(formData, "category") || "other",
    description: text(formData, "description"),
    amount: money(formData, "amount"),
    date: text(formData, "date") || todayStr(),
  };

  const { error } = await supabase.from("expenses").insert(values);

  if (error) throw new Error("Could not save the expense: " + error.message);

  revalidatePath("/expenses");
}

export async function updateExpense(expenseId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    category: text(formData, "category") || "other",
    description: text(formData, "description"),
    amount: money(formData, "amount"),
    date: text(formData, "date") || todayStr(),
  };

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
