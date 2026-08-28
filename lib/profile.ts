import { cache } from "react";
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
// Wrapped in React cache() so a single page render never does the auth +
// profile lookup more than once, no matter how many places call it.
export const requireProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load the profile, retrying once on a transient error. A FAILED lookup (a
  // Supabase blip) must NOT sign the user out — doing so was logging agents out
  // repeatedly during slow spells. Only a genuinely missing/deactivated account
  // signs out; a transient failure surfaces a retryable error and keeps the
  // session intact so a refresh recovers.
  let profile: Profile | null = null;
  let genuinelyMissing = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role, active, avatar_url")
      .eq("id", user.id)
      .single();
    if (!error) {
      profile = data as Profile;
      break;
    }
    if (error.code === "PGRST116") {
      genuinelyMissing = true; // query worked, there is no such row
      break;
    }
    if (attempt === 1) {
      throw new Error("Couldn't load your account just now — please refresh.");
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  // No profile, or a deactivated account, means no access to the app.
  // (The owner can never be deactivated — the Team page blocks self-deactivation.)
  if (genuinelyMissing || !profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login?deactivated=1");
  }

  return { supabase, profile };
});

// Owner and team lead can see the whole sales floor.
export function isFloorRole(role: Role) {
  return role === "owner" || role === "team_lead";
}
