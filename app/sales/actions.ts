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
    service_type: text(formData, "service_type") || "other",
    deal_size: money(formData, "deal_size"),
    revenue_received: money(formData, "revenue_received"),
    date_closed: text(formData, "date_closed") || todayStr(),
  };

  if (!values.client_name) throw new Error("The deal needs a client name.");

  const { data, error } = await supabase
    .from("deals")
    .insert(values)
    .select("id")
    .single();

  if (error) throw new Error("Could not save the deal: " + error.message);

  revalidatePath("/sales");
  redirect(`/sales/${data.id}`);
}

export async function updateDeal(dealId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    client_name: text(formData, "client_name"),
    service_type: text(formData, "service_type") || "other",
    deal_size: money(formData, "deal_size"),
    revenue_received: money(formData, "revenue_received"),
    date_closed: text(formData, "date_closed") || todayStr(),
  };

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
