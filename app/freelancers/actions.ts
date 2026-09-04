"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { SERVICES } from "@/lib/intake";

const SERVICE_VALUES = SERVICES.map((s) => s.value);

function text(fd: FormData, key: string) {
  return ((fd.get(key) as string) || "").trim();
}

function rating(fd: FormData, key: string) {
  const n = parseInt(text(fd, key), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
}

function values(fd: FormData) {
  const kind = text(fd, "kind");
  const services = fd
    .getAll("services")
    .map(String)
    .filter((s) => SERVICE_VALUES.includes(s));
  return {
    name: text(fd, "name"),
    kind: kind === "production_house" ? "production_house" : "freelancer",
    services,
    email: text(fd, "email") || null,
    phone: text(fd, "phone") || null,
    rate: text(fd, "rate") || null,
    portfolio_url: text(fd, "portfolio_url") || null,
    active: fd.get("active") === "on",
    notes: text(fd, "notes"),
    rating_quality: rating(fd, "rating_quality"),
    rating_price: rating(fd, "rating_price"),
    rating_speed: rating(fd, "rating_speed"),
    rating_communication: rating(fd, "rating_communication"),
  };
}

export async function createFreelancer(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const v = values(formData);
  if (!v.name) throw new Error("Give them a name.");

  const { data, error } = await supabase
    .from("freelancers")
    .insert(v)
    .select("id")
    .single();
  if (error) throw new Error("Could not save: " + error.message);

  revalidatePath("/freelancers");
  redirect(`/freelancers/${data.id}`);
}

export async function updateFreelancer(id: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const v = values(formData);
  if (!v.name) throw new Error("Give them a name.");

  const { error } = await supabase.from("freelancers").update(v).eq("id", id);
  if (error) throw new Error("Could not update: " + error.message);

  revalidatePath("/freelancers");
  revalidatePath(`/freelancers/${id}`);
}

export async function deleteFreelancer(id: string) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { error } = await supabase.from("freelancers").delete().eq("id", id);
  if (error) throw new Error("Could not delete: " + error.message);

  revalidatePath("/freelancers");
  redirect("/freelancers");
}
