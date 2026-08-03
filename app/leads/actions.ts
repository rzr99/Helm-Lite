"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/dates";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

// Accept leads that were assigned to me: take ownership (agent_id = me) and
// clear the pending flag. `all=on` accepts everything in my inbox; otherwise
// only the given client handle_keys. RLS lets an agent do this only for leads
// where assigned_to is already them.
export async function acceptAssignedLeads(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const acceptAll = formData.get("all") === "on";
  const keys = formData
    .getAll("keys")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  // Grab the affected leads (+ their current owner) first, so the transfer log
  // can record how to undo this accept.
  let sel = supabase
    .from("leads")
    .select("id, agent_id")
    .eq("assigned_to", user.id);
  if (!acceptAll) {
    if (keys.length === 0) redirect("/leads/assigned");
    sel = sel.in("handle_key", keys);
  }
  const { data: rowsData } = await sel;
  const rows = (rowsData ?? []) as { id: string; agent_id: string }[];
  if (rows.length === 0) redirect("/leads/assigned");

  const { data: batch } = await supabase
    .from("lead_transfer_batches")
    .insert({
      actor_id: user.id,
      kind: "accept",
      from_agent_id: rows[0].agent_id,
      to_agent_id: user.id,
      lead_count: rows.length,
    })
    .select("id")
    .single();
  if (batch) {
    await supabase.from("lead_transfer_items").insert(
      rows.map((r) => ({
        batch_id: batch.id,
        lead_id: r.id,
        prev_agent_id: r.agent_id,
        prev_assigned_to: user.id,
      }))
    );
  }

  const { error } = await supabase
    .from("leads")
    .update({ agent_id: user.id, assigned_to: null })
    .in(
      "id",
      rows.map((r) => r.id)
    );
  if (error) throw new Error("Could not accept the leads: " + error.message);

  revalidatePath("/leads");
  revalidatePath("/leads/assigned");
  revalidatePath("/");
  redirect("/leads/assigned?accepted=1");
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
    persona: text(formData, "persona") || null,
    notes: text(formData, "notes"),
    date_added: todayStr(),
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
    persona: text(formData, "persona") || null,
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

export async function deleteLead(leadId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) throw new Error("Could not delete the lead: " + error.message);

  revalidatePath("/leads");
  revalidatePath("/");
  redirect("/leads");
}

export async function setStage(leadId: string, stage: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({ stage })
    .eq("id", leadId);

  if (error) throw new Error("Could not move the lead: " + error.message);

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
