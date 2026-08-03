"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/profile";

export async function updateTeammate(userId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const values: {
    full_name: string;
    active: boolean;
    role?: string;
  } = {
    full_name: ((formData.get("full_name") as string) || "").trim(),
    active: formData.get("active") === "on",
  };

  // You cannot change your own role or deactivate yourself —
  // prevents locking the owner out of the app.
  if (userId !== user.id) {
    values.role = (formData.get("role") as string) || "agent";
  } else {
    values.active = true;
  }

  if (!values.full_name) throw new Error("Give this person a name.");

  const { error } = await supabase
    .from("users")
    .update(values)
    .eq("id", userId);

  if (error) throw new Error("Could not update: " + error.message);

  revalidatePath("/team");
}

// Move a set of clients (by canonical handle_key) from one agent to another.
// Each client's lead rows AND its still-open follow-ups move to the new agent;
// closed follow-ups and deals stay with the original person (their history and
// revenue credit). Clients the target already works are skipped when asked, so
// reassigning never doubles a client under one agent.
export async function reassignLeads(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const fromId = String(formData.get("from") || "");
  const toId = String(formData.get("to") || "");
  const skip = formData.get("skip") === "on";
  const keys = formData
    .getAll("keys")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!fromId || !toId || fromId === toId || keys.length === 0) {
    redirect(`/team/reassign?from=${fromId}&err=1`);
  }

  // Which of the chosen clients the target already works — the overlaps.
  const { data: toRows } = await supabase
    .from("leads")
    .select("handle_key")
    .eq("agent_id", toId)
    .in("handle_key", keys);
  const targetHas = new Set((toRows ?? []).map((r) => r.handle_key as string));

  const moveKeys = skip ? keys.filter((k) => !targetHas.has(k)) : keys;
  const skipped = keys.length - moveKeys.length;

  let movedLeads = 0;
  if (moveKeys.length > 0) {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("id")
      .eq("agent_id", fromId)
      .in("handle_key", moveKeys);
    const leadIds = (leadRows ?? []).map((r) => r.id as string);

    if (leadIds.length > 0) {
      const { error } = await supabase
        .from("leads")
        .update({ agent_id: toId })
        .in("id", leadIds);
      if (error) throw new Error("Could not reassign leads: " + error.message);
      movedLeads = leadIds.length;

      // Hand over pending work so nothing is orphaned under the old agent.
      await supabase
        .from("follow_ups")
        .update({ agent_id: toId })
        .in("lead_id", leadIds)
        .eq("done", false);
    }
  }

  revalidatePath("/team/reassign");
  revalidatePath("/leads");
  revalidatePath("/activity");
  revalidatePath("/");
  redirect(
    `/team/reassign?from=${fromId}&moved=${moveKeys.length}&leads=${movedLeads}&skipped=${skipped}`
  );
}
