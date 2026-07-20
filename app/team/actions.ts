"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
