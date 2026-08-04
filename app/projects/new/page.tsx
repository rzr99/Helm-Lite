import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { SERVICES, serviceDef, type IntakeField } from "@/lib/intake";
import { createProject } from "@/app/projects/actions";

export const dynamic = "force-dynamic";

function Field({ f }: { f: IntakeField }) {
  return (
    <div>
      <label className={labelClass}>
        {f.label}
        {f.required && <span className="text-red-500"> *</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea
          name={f.name}
          required={f.required}
          rows={3}
          placeholder={f.placeholder}
          className={inputClass}
        />
      ) : f.type === "select" ? (
        <select name={f.name} defaultValue="" className={inputClass}>
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={f.name}
          required={f.required}
          placeholder={f.placeholder}
          className={inputClass}
        />
      )}
      {f.help && (
        <p className="mt-1 text-xs text-[var(--text)]/40">{f.help}</p>
      )}
    </div>
  );
}

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
          <form action={createProject} className="flex flex-col gap-5">
            <input type="hidden" name="service" value={def.value} />
            {def.fields.map((f) => (
              <Field key={f.name} f={f} />
            ))}
            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Hand off to production
              </button>
              <Link href="/projects" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
