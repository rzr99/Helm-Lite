"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";

const STATUSES = ["applied", "interviewing", "hired", "rejected"];

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

function fields(formData: FormData) {
  const status = text(formData, "status");
  const ratingRaw = parseInt(text(formData, "rating") || "0", 10);
  return {
    full_name: text(formData, "full_name"),
    role_applied: text(formData, "role_applied"),
    email: text(formData, "email") || null,
    phone: text(formData, "phone") || null,
    interview_date: text(formData, "interview_date") || null,
    status: STATUSES.includes(status) ? status : "applied",
    rating: Number.isFinite(ratingRaw)
      ? Math.max(0, Math.min(5, ratingRaw))
      : 0,
    notes: text(formData, "notes"),
  };
}

export async function createCandidate(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const values = fields(formData);
  if (!values.full_name) throw new Error("Give the candidate a name.");

  const { data, error } = await supabase
    .from("candidates")
    .insert(values)
    .select("id")
    .single();
  if (error) throw new Error("Could not save: " + error.message);

  revalidatePath("/hiring");
  redirect(`/hiring/${data.id}`);
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const values = fields(formData);
  if (!values.full_name) throw new Error("Give the candidate a name.");

  const { error } = await supabase
    .from("candidates")
    .update(values)
    .eq("id", candidateId);
  if (error) throw new Error("Could not update: " + error.message);

  revalidatePath("/hiring");
  revalidatePath(`/hiring/${candidateId}`);
}

export async function deleteCandidate(candidateId: string) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  // Remove the CV file too, if any.
  const { data: c } = await supabase
    .from("candidates")
    .select("cv_path")
    .eq("id", candidateId)
    .single();
  if (c?.cv_path) {
    await supabase.storage.from("cvs").remove([c.cv_path]);
  }

  const { error } = await supabase
    .from("candidates")
    .delete()
    .eq("id", candidateId);
  if (error) throw new Error("Could not delete: " + error.message);

  revalidatePath("/hiring");
  redirect("/hiring");
}
