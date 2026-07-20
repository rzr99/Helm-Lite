import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "team_lead" | "agent";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
  avatar_url: string | null;
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
    .select("id, full_name, role, active, avatar_url")
    .eq("id", user.id)
    .single();

  // No profile, or a deactivated account, means no access to the app.
  // (The owner can never be deactivated — the Team page blocks self-deactivation.)
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login?deactivated=1");
  }

  return { supabase, profile: profile as Profile };
}

// Owner and team lead can see the whole sales floor.
export function isFloorRole(role: Role) {
  return role === "owner" || role === "team_lead";
}
