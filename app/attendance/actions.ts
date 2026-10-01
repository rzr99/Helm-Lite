"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAttStatus } from "@/lib/attendance";

// Owner marks a whole day in one submit. Each person shown has a radio group
// named status_<userId>; value "clear" removes any existing mark, a real status
// upserts it, and anything else (no change) is skipped.
export async function markDay(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const date = String(formData.get("date") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pick a valid date.");

  const userIds = formData.getAll("user_ids").map(String);
  const now = new Date().toISOString();

  const upserts: {
    user_id: string;
    date: string;
    status: string;
    marked_by: string;
    updated_at: string;
  }[] = [];
  const clears: string[] = [];

  for (const uid of userIds) {
    const value = String(formData.get(`status_${uid}`) || "");
    if (value === "clear") clears.push(uid);
    else if (isAttStatus(value))
      upserts.push({
        user_id: uid,
        date,
        status: value,
        marked_by: user.id,
        updated_at: now,
      });
    // otherwise: left untouched
  }

  if (upserts.length) {
    const { error } = await supabase
      .from("attendance")
      .upsert(upserts, { onConflict: "user_id,date" });
    if (error) throw new Error("Could not save attendance: " + error.message);
  }

  if (clears.length) {
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("date", date)
      .in("user_id", clears);
    if (error) throw new Error("Could not clear attendance: " + error.message);
  }

  revalidatePath("/attendance");
  revalidatePath("/");
}
