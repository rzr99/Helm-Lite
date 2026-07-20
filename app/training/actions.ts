"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

export async function createAsset(formData: FormData) {
  const supabase = await createClient();

  const values = {
    title: text(formData, "title"),
    category: text(formData, "category") || null,
    content: text(formData, "content") || null,
  };

  if (!values.title) throw new Error("Give the material a title.");

  const { data, error } = await supabase
    .from("training_assets")
    .insert(values)
    .select("id")
    .single();

  if (error) throw new Error("Could not save: " + error.message);

  revalidatePath("/training");
  redirect(`/training/${data.id}`);
}

export async function updateAsset(assetId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    title: text(formData, "title"),
    category: text(formData, "category") || null,
    content: text(formData, "content") || null,
  };

  if (!values.title) throw new Error("Give the material a title.");

  const { error } = await supabase
    .from("training_assets")
    .update(values)
    .eq("id", assetId);

  if (error) throw new Error("Could not update: " + error.message);

  revalidatePath("/training");
  revalidatePath(`/training/${assetId}`);
  redirect(`/training/${assetId}`);
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("training_assets")
    .delete()
    .eq("id", assetId);

  if (error) throw new Error("Could not delete: " + error.message);

  revalidatePath("/training");
  redirect("/training");
}
