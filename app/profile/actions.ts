"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateMyName(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = ((formData.get("full_name") as string) || "").trim();
  if (!fullName) throw new Error("Your name can't be empty.");

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) throw new Error("Could not save: " + error.message);

  revalidatePath("/profile");
  revalidatePath("/");
}
