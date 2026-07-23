"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Stamp the moment of login. The proxy compares this against a 24h window and
// forces a fresh sign-in once it's older, so no session stays open forever.
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
