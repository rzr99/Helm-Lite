"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { clientKey } from "@/lib/sales";

type Moved = { id: string; deal_id: string };

async function requireOwner() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") throw new Error("Only the owner can merge sales.");
  return supabase;
}

// Old sales were logged once per instalment. Merge the ticked rows into the
// one marked "keep": every payment moves onto it and the extra rows are
// removed. The kept sale's own total, date and details stay as they are.
// A full copy of the removed rows goes into deal_merges first, so it can be
// undone.
export async function mergeDeals(formData: FormData) {
  const supabase = await requireOwner();

  const ids = [...new Set(formData.getAll("ids").map(String))];
  const keep = String(formData.get("keep") ?? "");
  if (!keep || !ids.includes(keep))
    throw new Error("Tick the sale you want to keep (it must be one of the ticked rows).");
  const removeIds = ids.filter((id) => id !== keep);
  if (removeIds.length === 0)
    throw new Error("Tick at least two sales to merge.");

  const logId = await mergeInto(supabase, keep, removeIds);

  revalidatePath("/sales");
  revalidatePath("/sales/merge");
  redirect(`/sales/merge?merged=${logId}`);
}

type Supa = Awaited<ReturnType<typeof requireOwner>>;

async function mergeInto(supabase: Supa, keep: string, removeIds: string[]) {
  const [{ data: removed }, { data: payments }, { data: jobs }] =
    await Promise.all([
      supabase.from("deals").select("*").in("id", removeIds),
      supabase.from("deal_payments").select("id, deal_id").in("deal_id", removeIds),
      supabase.from("production_jobs").select("id, deal_id").in("deal_id", removeIds),
    ]);
  if (!removed || removed.length !== removeIds.length)
    throw new Error("Some of those sales could not be found. Reload and try again.");

  const { data: log, error: logError } = await supabase
    .from("deal_merges")
    .insert({
      kept_deal_id: keep,
      removed_deals: removed,
      moved_payments: payments ?? [],
      moved_jobs: jobs ?? [],
    })
    .select("id")
    .single();
  if (logError) throw new Error("Could not start the merge: " + logError.message);

  const { error: payError } = await supabase
    .from("deal_payments")
    .update({ deal_id: keep })
    .in("deal_id", removeIds);
  if (payError) throw new Error("Could not move the payments: " + payError.message);

  if ((jobs ?? []).length > 0) {
    const { error: jobError } = await supabase
      .from("production_jobs")
      .update({ deal_id: keep })
      .in("deal_id", removeIds);
    if (jobError) throw new Error("Could not move linked projects: " + jobError.message);
  }

  const { error: delError } = await supabase
    .from("deals")
    .delete()
    .in("id", removeIds);
  if (delError)
    throw new Error(
      "Payments were moved but the extra rows were not removed: " +
        delError.message +
        ". Use Undo on the merge page to put everything back."
    );

  return log.id as string;
}

// The obvious ones: same client, same agent, same sale total — the old form
// re-entered the full total with every payment. Keeps the earliest row of each.
// Each group is its own logged (undoable) merge.
export async function mergeAllObvious() {
  const supabase = await requireOwner();

  const { data } = await supabase
    .from("deals")
    .select("id, client_name, agent_id, deal_size, date_closed, created_at")
    .order("date_closed")
    .order("created_at")
    .limit(100000);

  const groups = new Map<string, string[]>();
  for (const d of data ?? []) {
    const key = `${clientKey(d.client_name)}|${d.agent_id}|${Number(d.deal_size)}`;
    if (key.startsWith("|")) continue;
    groups.set(key, [...(groups.get(key) ?? []), d.id]);
  }

  let merged = 0;
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    await mergeInto(supabase, ids[0], ids.slice(1));
    merged++;
  }

  revalidatePath("/sales");
  revalidatePath("/sales/merge");
  redirect(`/sales/merge?all=${merged}`);
}

export async function undoMerge(mergeId: string) {
  const supabase = await requireOwner();

  const { data: log } = await supabase
    .from("deal_merges")
    .select("id, removed_deals, moved_payments, moved_jobs, undone_at")
    .eq("id", mergeId)
    .single();
  if (!log) throw new Error("That merge was not found.");
  if (log.undone_at) throw new Error("That merge was already undone.");

  // `balance` is computed by the database and can't be written.
  const rows = (log.removed_deals as Record<string, unknown>[]).map((r) => {
    const copy = { ...r };
    delete copy.balance;
    return copy;
  });
  const { error: insError } = await supabase.from("deals").upsert(rows);
  if (insError) throw new Error("Could not restore the sales: " + insError.message);

  const moveBack = async (table: string, moved: Moved[]) => {
    const byDeal = new Map<string, string[]>();
    for (const m of moved)
      byDeal.set(m.deal_id, [...(byDeal.get(m.deal_id) ?? []), m.id]);
    for (const [dealId, idList] of byDeal) {
      const { error } = await supabase
        .from(table)
        .update({ deal_id: dealId })
        .in("id", idList);
      if (error) throw new Error("Could not move items back: " + error.message);
    }
  };
  await moveBack("deal_payments", log.moved_payments as Moved[]);
  await moveBack("production_jobs", log.moved_jobs as Moved[]);

  await supabase
    .from("deal_merges")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", mergeId);

  revalidatePath("/sales");
  revalidatePath("/sales/merge");
  redirect("/sales/merge?undone=1");
}
