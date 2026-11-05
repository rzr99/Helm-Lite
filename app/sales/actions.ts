"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/dates";
import { clientKey } from "@/lib/sales";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/[$,\s]/g, "");
  if (raw === "") return 0;
  const value = Number(raw);
  if (Number.isNaN(value) || value < 0) {
    throw new Error("Amounts must be plain numbers, like 1500 or 1500.50");
  }
  return value;
}

export async function createDeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const values = {
    agent_id: text(formData, "agent_id") || user.id,
    lead_id: text(formData, "lead_id") || null,
    client_name: text(formData, "client_name"),
    service: text(formData, "service") || null,
    service_category: text(formData, "service_category") || null,
    deal_size: money(formData, "deal_size"),
    date_closed: text(formData, "date_closed") || todayStr(),
    payment_method: text(formData, "payment_method") || null,
    merchant_name: text(formData, "merchant_name") || null,
    social_platform: text(formData, "social_platform") || null,
    conversation: text(formData, "conversation") || null,
    designer: text(formData, "designer") || null,
  };
  // Whatever the client paid up front becomes the sale's first payment.
  const firstPayment = money(formData, "revenue_received");

  if (!values.client_name) throw new Error("The deal needs a client name.");

  // Same sale, next payment? Either the agent picked it, or it's the same
  // client + same total as one of this agent's sales that still has money
  // owed. Then the existing entry is updated instead of a new sale being made.
  let existingId = text(formData, "existing_deal_id");
  if (!existingId) {
    const { data: open } = await supabase
      .from("deals")
      .select("id, client_name")
      .eq("agent_id", values.agent_id)
      .eq("deal_size", values.deal_size)
      .gt("balance", 0)
      .order("date_closed", { ascending: false })
      .limit(200);
    const key = clientKey(values.client_name);
    existingId =
      (open ?? []).find((d) => clientKey(d.client_name) === key)?.id ?? "";
  }

  if (existingId) {
    const { data: sale } = await supabase
      .from("deals")
      .select("id")
      .eq("id", existingId)
      .single();
    if (!sale) throw new Error("That sale could not be found.");

    // Keep the sale's agent and close date; refresh the details the agent
    // filled in (a blank field leaves what's there).
    const changes: Record<string, unknown> = {
      client_name: values.client_name,
      deal_size: values.deal_size,
    };
    for (const k of [
      "service",
      "service_category",
      "payment_method",
      "merchant_name",
      "social_platform",
      "conversation",
      "designer",
    ] as const)
      if (values[k]) changes[k] = values[k];

    const { error: upError } = await supabase
      .from("deals")
      .update(changes)
      .eq("id", existingId);
    if (upError) throw new Error("Could not update the sale: " + upError.message);

    if (firstPayment > 0) {
      const { error: payError } = await supabase.from("deal_payments").insert({
        deal_id: existingId,
        agent_id: values.agent_id,
        amount: firstPayment,
        paid_on: values.date_closed,
        payment_method: values.payment_method,
      });
      if (payError)
        throw new Error("Could not save the payment: " + payError.message);
    }

    revalidatePath("/sales");
    revalidatePath(`/sales/${existingId}`);
    redirect(`/sales/${existingId}?updated=1`);
  }

  const { data, error } = await supabase
    .from("deals")
    .insert(values)
    .select("id")
    .single();

  if (error) throw new Error("Could not save the deal: " + error.message);

  if (firstPayment > 0) {
    const { error: payError } = await supabase.from("deal_payments").insert({
      deal_id: data.id,
      agent_id: values.agent_id,
      amount: firstPayment,
      paid_on: values.date_closed,
      payment_method: values.payment_method,
    });
    if (payError)
      throw new Error(
        "The sale was saved, but its first payment was not: " +
          payError.message +
          ". Open the sale and use Record payment."
      );
  }

  revalidatePath("/sales");
  redirect(`/sales/${data.id}`);
}

export async function updateDeal(dealId: string, formData: FormData) {
  const supabase = await createClient();

  const values: Record<string, unknown> = {
    client_name: text(formData, "client_name"),
    service: text(formData, "service") || null,
    service_category: text(formData, "service_category") || null,
    deal_size: money(formData, "deal_size"),
    // revenue_received is not typed any more: it is the sum of the sale's
    // payments, kept in step by the database.
    date_closed: text(formData, "date_closed") || todayStr(),
    payment_method: text(formData, "payment_method") || null,
    merchant_name: text(formData, "merchant_name") || null,
    social_platform: text(formData, "social_platform") || null,
    conversation: text(formData, "conversation") || null,
  };

  // Only the owner's edit form carries the designer field. When a non-owner
  // saves (field absent), leave the assigned production person untouched.
  if (formData.has("designer")) {
    values.designer = text(formData, "designer") || null;
  }

  if (!values.client_name) throw new Error("The deal needs a client name.");

  const { error } = await supabase
    .from("deals")
    .update(values)
    .eq("id", dealId);

  if (error) throw new Error("Could not update the deal: " + error.message);

  revalidatePath("/sales");
  revalidatePath(`/sales/${dealId}`);
}

export async function deleteDeal(dealId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("deals").delete().eq("id", dealId);

  if (error) throw new Error("Could not delete the deal: " + error.message);

  revalidatePath("/sales");
  redirect("/sales");
}

// A later instalment on an existing sale. The sale stays one sale; this cash
// counts toward the month it was paid in.
export async function addPayment(dealId: string, formData: FormData) {
  const supabase = await createClient();

  const amount = money(formData, "amount");
  if (amount <= 0) throw new Error("Enter the amount the client paid.");

  const { data: deal } = await supabase
    .from("deals")
    .select("agent_id")
    .eq("id", dealId)
    .single();
  if (!deal) throw new Error("Sale not found.");

  const { error } = await supabase.from("deal_payments").insert({
    deal_id: dealId,
    agent_id: deal.agent_id,
    amount,
    paid_on: text(formData, "paid_on") || todayStr(),
    payment_method: text(formData, "payment_method") || null,
    note: text(formData, "note") || null,
  });

  if (error) throw new Error("Could not save the payment: " + error.message);

  revalidatePath("/sales");
  revalidatePath(`/sales/${dealId}`);
}

export async function deletePayment(dealId: string, paymentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("deal_payments")
    .delete()
    .eq("id", paymentId);

  if (error) throw new Error("Could not remove the payment: " + error.message);

  revalidatePath("/sales");
  revalidatePath(`/sales/${dealId}`);
}
