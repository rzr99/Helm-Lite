import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { serviceDef, serviceLabel } from "@/lib/intake";
import { updateProjectIntake } from "@/app/projects/actions";
import { IntakeForm, Field } from "@/components/intake-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const { data } = await supabase
    .from("production_jobs")
    .select("id, agent_id, service, intake")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const canEdit = data.agent_id === profile.id || profile.role === "owner";
  if (!canEdit) notFound();

  const def = serviceDef(data.service);
  if (!def) notFound();
  const intake = (data.intake ?? {}) as Record<string, string>;

  return (
    <Shell
      profile={profile}
      active="projects"
      title={`Edit intake — ${serviceLabel(data.service)}`}
      subtitle="Update anything you got wrong, then save."
    >
      <div className="max-w-xl">
        <Link
          href={`/projects/${id}`}
          className="mb-4 inline-block text-sm text-[var(--text)]/50 hover:text-[var(--text)]"
        >
          ← Back to project
        </Link>
        <Card padded>
          <IntakeForm
            action={updateProjectIntake.bind(null, id)}
            service={def.value}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            cancelHref={`/projects/${id}`}
          >
            {def.fields.map((f) => (
              <Field key={f.name} f={f} value={intake[f.name]} />
            ))}
          </IntakeForm>
        </Card>
      </div>
    </Shell>
  );
}
