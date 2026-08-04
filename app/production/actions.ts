"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stationsForType, STATUSES, type JobTypeValue } from "@/lib/production";

function text(fd: FormData, key: string) {
  return ((fd.get(key) as string) || "").trim();
}

export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const client_name = text(formData, "client_name");
  if (!client_name) throw new Error("The job needs a client or project name.");
  const job_type = (text(formData, "job_type") || "launch") as JobTypeValue;

  const { data: job, error } = await supabase
    .from("production_jobs")
    .insert({
      agent_id: text(formData, "agent_id") || user.id,
      client_name,
      job_type,
      designer: text(formData, "designer") || null,
      deadline: text(formData, "deadline") || null,
      notes: text(formData, "notes"),
    })
    .select("id")
    .single();

  if (error) throw new Error("Could not create the job: " + error.message);

  // Seed the checklist from the type's stations.
  const steps = stationsForType(job_type).map((s, i) => ({
    job_id: job.id,
    station_key: s.key,
    label: s.name,
    is_gate: !!s.isGate,
    sort: i,
  }));
  const { error: stepErr } = await supabase.from("production_steps").insert(steps);
  if (stepErr) throw new Error("Could not set up the checklist: " + stepErr.message);

  revalidatePath("/production");
  redirect(`/production/${job.id}`);
}

export async function toggleStep(stepId: string, done: boolean, jobId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("production_steps")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", stepId);

  if (error) throw new Error("Could not update the step: " + error.message);

  revalidatePath(`/production/${jobId}`);
  revalidatePath("/production");
}

export async function setJobStatus(jobId: string, status: string) {
  const supabase = await createClient();

  if (!STATUSES.some((s) => s.value === status)) {
    throw new Error("Unknown status.");
  }

  // Quality gate: a job can't be delivered or marked paid until every
  // station on its line is ticked.
  if (status === "delivered" || status === "paid") {
    const { data: steps } = await supabase
      .from("production_steps")
      .select("done")
      .eq("job_id", jobId);
    const remaining = (steps ?? []).filter((s) => !s.done).length;
    if (remaining > 0) {
      throw new Error(
        `${remaining} station${remaining === 1 ? "" : "s"} still unchecked — finish the line before delivery.`
      );
    }
  }

  const { error } = await supabase
    .from("production_jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error("Could not update the job: " + error.message);

  revalidatePath(`/production/${jobId}`);
  revalidatePath("/production");
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("production_jobs")
    .delete()
    .eq("id", jobId);

  if (error) throw new Error("Could not delete the job: " + error.message);

  revalidatePath("/production");
  redirect("/production");
}
