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

// Offer a set of clients (by canonical handle_key) from one agent to another.
// This sets `assigned_to` — it does NOT change ownership. The receiving agent
// gets them in their "Assigned to me" inbox and chooses to accept (one by one
// or all) or work them directly; only on accept do they become that agent's own
// leads. Clients the target already works OR already has offered to them are
// skipped when asked, so a transfer never doubles a client under one agent.
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

  // Fetch every lead with these handle_keys (owner can read all) and decide in
  // code — simpler and more reliable than an .or() + .in() combined filter.
  const { data: toRows } = await supabase
    .from("leads")
    .select("handle_key, agent_id, assigned_to")
    .in("handle_key", keys);
  const scanned = toRows ?? [];
  // Clients the target already owns or was already offered — the overlaps.
  const targetHas = new Set(
    scanned
      .filter((r) => r.agent_id === toId || r.assigned_to === toId)
      .map((r) => r.handle_key as string)
  );
  // Clients of the FROM agent already offered to SOMEONE — so splitting a book
  // across several agents never double-offers the same lead.
  const alreadyPending = new Set(
    scanned
      .filter((r) => r.agent_id === fromId && r.assigned_to != null)
      .map((r) => r.handle_key as string)
  );

  const moveKeys = skip
    ? keys.filter((k) => !targetHas.has(k) && !alreadyPending.has(k))
    : keys;
  const skipped = keys.length - moveKeys.length;

  let movedLeads = 0;
  if (moveKeys.length > 0) {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("id, agent_id, assigned_to")
      .eq("agent_id", fromId)
      .in("handle_key", moveKeys);
    const rows = (leadRows ?? []) as {
      id: string;
      agent_id: string;
      assigned_to: string | null;
    }[];

    if (rows.length > 0) {
      // Log this transfer first so it can be undone later.
      const { data: batch } = await supabase
        .from("lead_transfer_batches")
        .insert({
          actor_id: profile.id,
          kind: "assign",
          from_agent_id: fromId,
          to_agent_id: toId,
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
            prev_assigned_to: r.assigned_to,
          }))
        );
      }

      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: toId })
        .in(
          "id",
          rows.map((r) => r.id)
        );
      if (error) throw new Error("Could not assign leads: " + error.message);
      movedLeads = rows.length;
    }
  }

  revalidatePath("/team/reassign");
  revalidatePath("/leads");
  revalidatePath("/leads/assigned");
  redirect(
    `/team/reassign?from=${fromId}&moved=${moveKeys.length}&leads=${movedLeads}&skipped=${skipped}`
  );
}

// Undo a logged transfer: restore every lead in the batch to the owner /
// assignment it had before. Owner-only.
export async function revertTransferBatch(batchId: string) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: batch } = await supabase
    .from("lead_transfer_batches")
    .select("id, reverted_at")
    .eq("id", batchId)
    .single();
  if (!batch || batch.reverted_at) redirect("/team/reassign");

  const { data: itemsData } = await supabase
    .from("lead_transfer_items")
    .select("lead_id, prev_agent_id, prev_assigned_to")
    .eq("batch_id", batchId);
  const items = (itemsData ?? []) as {
    lead_id: string;
    prev_agent_id: string | null;
    prev_assigned_to: string | null;
  }[];

  // Group by prev-state so it's a couple of updates, not one per lead.
  const groups = new Map<
    string,
    { agent: string | null; assigned: string | null; ids: string[] }
  >();
  for (const it of items) {
    const key = `${it.prev_agent_id}|${it.prev_assigned_to}`;
    let g = groups.get(key);
    if (!g) {
      g = { agent: it.prev_agent_id, assigned: it.prev_assigned_to, ids: [] };
      groups.set(key, g);
    }
    g.ids.push(it.lead_id);
  }
  for (const g of groups.values()) {
    if (g.ids.length === 0 || !g.agent) continue;
    await supabase
      .from("leads")
      .update({ agent_id: g.agent, assigned_to: g.assigned })
      .in("id", g.ids);
  }

  await supabase
    .from("lead_transfer_batches")
    .update({ reverted_at: new Date().toISOString(), reverted_by: profile.id })
    .eq("id", batchId);

  revalidatePath("/team/reassign");
  revalidatePath("/leads");
  revalidatePath("/leads/assigned");
  revalidatePath("/");
  redirect("/team/reassign?reverted=1");
}
