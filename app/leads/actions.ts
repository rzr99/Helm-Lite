"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

export async function createLead(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const values = {
    agent_id: text(formData, "agent_id") || user.id,
    handle: text(formData, "handle"),
    name: text(formData, "name") || null,
    service_interest: text(formData, "service_interest") || null,
    source: text(formData, "source") || null,
    stage: text(formData, "stage") || "new",
    notes: text(formData, "notes"),
  };

  if (!values.handle) throw new Error("The lead needs a handle or name.");

  const { data, error } = await supabase
    .from("leads")
    .insert(values)
    .select("id")
    .single();

  if (error) throw new Error("Could not save the lead: " + error.message);

  revalidatePath("/leads");
  revalidatePath("/");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(leadId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    handle: text(formData, "handle"),
    name: text(formData, "name") || null,
    service_interest: text(formData, "service_interest") || null,
    source: text(formData, "source") || null,
    stage: text(formData, "stage") || "new",
    notes: text(formData, "notes"),
  };

  if (!values.handle) throw new Error("The lead needs a handle or name.");

  const { error } = await supabase
    .from("leads")
    .update(values)
    .eq("id", leadId);

  if (error) throw new Error("Could not update the lead: " + error.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function addFollowUp(
  leadId: string,
  agentId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const dueDate = text(formData, "due_date");
  if (!dueDate) throw new Error("Pick a follow-up date.");

  const { error } = await supabase.from("follow_ups").insert({
    lead_id: leadId,
    agent_id: agentId,
    due_date: dueDate,
    note: text(formData, "note"),
  });

  if (error) throw new Error("Could not save the follow-up: " + error.message);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

export async function setFollowUpDone(
  followUpId: string,
  done: boolean,
  pathToRefresh: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ done })
    .eq("id", followUpId);

  if (error)
    throw new Error("Could not update the follow-up: " + error.message);

  revalidatePath(pathToRefresh);
  revalidatePath("/");
}
