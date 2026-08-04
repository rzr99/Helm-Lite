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
  revalidatePath(`/projects/${jobId}`);
  revalidatePath("/projects");
}

// The simple status walk (New → Briefed & sent → In production → Delivered).
export async function setProjectStatus(jobId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_jobs")
    .update({ status })
    .eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${jobId}`);
  revalidatePath("/projects");
}
