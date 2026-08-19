"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceDef } from "@/lib/intake";
import { briefFields } from "@/lib/brief";

function text(fd: FormData, key: string) {
  return ((fd.get(key) as string) || "").trim();
}

// Form 1 — the agent / team lead collects the intake and hands it to the owner.
export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = text(formData, "service");
  const def = serviceDef(service);
  if (!def) throw new Error("Pick a service first.");

  const intake: Record<string, string> = {};
  for (const f of def.fields) {
    const v = text(formData, f.name);
    if (v) intake[f.name] = v;
  }

  const client_name = intake["brand_name"];
  if (!client_name) throw new Error("The client's brand / business name is required.");

  // Guard against a double-submit (double-click / retry) creating two identical
  // handoffs: if this agent just filed the same client + service, reuse it.
  const { data: dupe } = await supabase
    .from("production_jobs")
    .select("id")
    .eq("agent_id", user.id)
    .eq("client_name", client_name)
    .eq("service", service)
    .gte("handed_off_at", new Date(Date.now() - 60_000).toISOString())
    .order("handed_off_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dupe) redirect(`/projects/${dupe.id}`);

  const { data, error } = await supabase
    .from("production_jobs")
    .insert({
      agent_id: user.id,
      client_name,
      service,
      intake,
      status: "new",
      handed_off_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error("Could not hand off the project: " + error.message);

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

// Edit an existing intake (the agent who filed it, or the owner — enforced by
// the "proj update own or owner" RLS policy).
export async function updateProjectIntake(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("production_jobs")
    .select("service")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Project not found.");
  const def = serviceDef(job.service);
  if (!def) throw new Error("Unknown service.");

  const intake: Record<string, string> = {};
  for (const f of def.fields) {
    const v = text(formData, f.name);
    if (v) intake[f.name] = v;
  }
  const client_name = intake["brand_name"];
  if (!client_name)
    throw new Error("The client's brand / business name is required.");

  const { error } = await supabase
    .from("production_jobs")
    .update({ client_name, intake })
    .eq("id", jobId);
  if (error) throw new Error("Could not update the project: " + error.message);

  revalidatePath(`/projects/${jobId}`);
  revalidatePath("/projects");
  redirect(`/projects/${jobId}`);
}

// Form 2 — the owner completes the production-ready brief and assigns a producer.
export async function saveBrief(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("production_jobs")
    .select("service")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Project not found.");

  const brief: Record<string, string> = {};
  for (const f of briefFields(job.service)) {
    const v = text(formData, f.name);
    if (v) brief[f.name] = v;
  }

  const { error } = await supabase
    .from("production_jobs")
    .update({
      brief,
      designer: text(formData, "designer") || null,
    })
    .eq("id", jobId);
  if (error) throw new Error("Could not save the brief: " + error.message);
  revalidatePath("/projects");
  // Redirect so the saved brief + WhatsApp text re-render immediately.
  redirect(`/projects/${jobId}`);
}

// Record why a project was lost.
export async function saveLostReason(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_jobs")
    .update({ lost_reason: text(formData, "lost_reason") || null })
    .eq("id", jobId);
  if (error) throw new Error("Could not save the reason: " + error.message);
  revalidatePath("/projects");
  redirect(`/projects/${jobId}`);
}

// Delete a project (owner-only, enforced by RLS). Its SOP steps cascade away.
export async function deleteProject(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_jobs")
    .delete()
    .eq("id", jobId);
  if (error) throw new Error("Could not delete the project: " + error.message);
  revalidatePath("/projects");
  redirect("/projects");
}

// The simple status walk (New → Briefed & sent → In production → Delivered).
export async function setProjectStatus(jobId: string, status: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_jobs")
    .update({ status })
    .eq("id", jobId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    // RLS matched no row — the change silently didn't save.
    throw new Error("Couldn't update the status — the change wasn't saved.");
  }
  revalidatePath("/projects");
  // Redirect back so the page re-renders with the new status (revalidatePath
  // alone doesn't reliably refresh a dynamic route after a void action).
  redirect(`/projects/${jobId}`);
}
