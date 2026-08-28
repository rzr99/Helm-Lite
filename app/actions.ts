"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Stamp the moment of login. The proxy slides this forward on activity and
// forces a fresh sign-in after 24h of INACTIVITY, so abandoned sessions close
// but active agents aren't interrupted.
export async function startSession() {
  const store = await cookies();
  store.set("helm_login_at", String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete("helm_login_at");
  redirect("/login");
}
