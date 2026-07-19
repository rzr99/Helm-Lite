import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "team_lead" | "agent";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
};

// Loads the signed-in user's profile, or sends them to the login page.
export async function requireProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { supabase, profile: profile as Profile };
}

// Owner and team lead can see the whole sales floor.
export function isFloorRole(role: Role) {
  return role === "owner" || role === "team_lead";
}
