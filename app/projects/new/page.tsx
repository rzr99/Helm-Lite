import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { SERVICES, serviceDef } from "@/lib/intake";
import { createProject } from "@/app/projects/actions";
import { IntakeForm, Field } from "@/components/intake-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { profile } = await requireProfile();
  const { service } = await searchParams;
  const def = service ? serviceDef(service) : undefined;

  // Step 1 — pick the service.
  if (!def) {
    return (
      <Shell
        profile={profile}
        active="projects"
        title="New project"
        subtitle="Pick the service you sold, then fill in the client intake."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <Link
              key={s.value}
              href={`/projects/new?service=${s.value}`}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 transition-colors hover:border-amber-600/50 hover:bg-[var(--sunken)]"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rotate-45 bg-amber-600" />
                <p className="font-semibold text-[var(--text)]">{s.label}</p>
              </div>
              <p className="mt-1.5 text-sm text-[var(--text)]/55">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </Shell>
    );
  }

  // Step 2 — fill the intake for that service.
  return (
    <Shell
      profile={profile}
      active="projects"
      title={`Intake — ${def.label}`}
      subtitle="Collect this from the client, then hand it off. Fill what you have — you can update it later."
    >
      <div className="max-w-xl">
        <Link
          href="/projects/new"
          className="mb-4 inline-block text-sm text-[var(--text)]/50 hover:text-[var(--text)]"
        >
          ← Change service
        </Link>
        <Card padded>
          <IntakeForm
            action={createProject}
            service={def.value}
            submitLabel="Hand off to production"
            pendingLabel="Handing off…"
            cancelHref="/projects"
          >
            {def.fields.map((f) => (
              <Field key={f.name} f={f} />
            ))}
          </IntakeForm>
        </Card>
      </div>
    </Shell>
  );
}
