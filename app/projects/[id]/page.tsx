import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { serviceDef, serviceLabel } from "@/lib/intake";
import { briefFields, briefText, type BriefField } from "@/lib/brief";
import { PROJECT_STATUSES, projectStatusLabel } from "@/lib/production";
import { CopyButton } from "@/components/copy-button";
import { setProjectStatus, saveBrief } from "@/app/projects/actions";
import { DeleteProjectButton } from "@/components/delete-project";

export const dynamic = "force-dynamic";

type Project = {
  id: string;
  agent_id: string;
  client_name: string;
  service: string;
  status: string;
  designer: string | null;
  intake: Record<string, string>;
  brief: Record<string, string>;
  agent: { full_name: string } | null;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const { data } = await supabase
    .from("production_jobs")
    .select(
      "id, agent_id, client_name, service, status, designer, intake, brief, agent:users(full_name)"
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const project = data as unknown as Project;

  const def = serviceDef(project.service);
  const intake = project.intake ?? {};
  const brief = project.brief ?? {};
  const isOwner = profile.role === "owner";
  const status = project.status || "new";
  const canEdit = isOwner || project.agent_id === profile.id;

  // Form 1 — what the agent sent.
  const intakeCard = (
    <Card
      title="What the agent sent"
      description="Collected from the client. Your brief below turns this into something production-ready."
      padded
      action={
        canEdit ? (
          <Link
            href={`/projects/${project.id}/edit`}
            className="text-sm font-medium text-amber-600 hover:underline"
          >
            Edit
          </Link>
        ) : undefined
      }
    >
      {(def?.fields ?? []).filter((f) => intake[f.name]).length === 0 ? (
        <p className="text-sm text-[var(--text)]/50">Nothing filled in.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-[var(--border)]">
          {(def?.fields ?? [])
            .filter((f) => intake[f.name])
            .map((f) => (
              <div key={f.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
                <dt className="shrink-0 text-sm text-[var(--text)]/50 sm:w-52">{f.label}</dt>
                <dd className="whitespace-pre-wrap text-sm text-[var(--text)]/90">
                  {intake[f.name]}
                </dd>
              </div>
            ))}
        </dl>
      )}
    </Card>
  );

  // Agents: their handoff + status, with edit/delete of their own.
  if (!isOwner) {
    const isCreator = project.agent_id === profile.id;
    return (
      <Shell
        profile={profile}
        active="projects"
        title={project.client_name}
        subtitle={`${serviceLabel(project.service)} · ${projectStatusLabel(status)}`}
      >
        {intakeCard}
        {isCreator && (
          <Card
            title="Danger zone"
            description="Deletes this handoff. There is no undo."
            padded
          >
            <DeleteProjectButton id={project.id} />
          </Card>
        )}
      </Shell>
    );
  }

  const fields = briefFields(project.service);
  const finishedBrief = briefText(project.client_name, project.service, brief);

  // Active freelancers to pick from for "Assigned to".
  const { data: flData } = await supabase
    .from("freelancers")
    .select("name")
    .eq("active", true)
    .order("name");
  const freelancerNames = [
    ...new Set((flData ?? []).map((r) => r.name as string).filter(Boolean)),
  ];

  const fieldInput = (f: BriefField) => {
    const own = brief[f.name] ?? "";
    const inherited = f.from ? intake[f.from] ?? "" : "";
    const value = own || inherited;
    const prefilled = !own && !!inherited;
    return (
      <div key={f.name}>
        <label className={labelClass}>
          {f.label}
          {prefilled && (
            <span
              className="ml-2 inline-block h-1.5 w-1.5 rotate-45 bg-amber-600 align-middle"
              title="Pre-filled from the agent's handoff"
            />
          )}
        </label>
        {f.type === "textarea" ? (
          <textarea name={f.name} defaultValue={value} rows={2} className={inputClass} />
        ) : f.type === "select" ? (
          <select name={f.name} defaultValue={value} className={inputClass}>
            <option value="">Select…</option>
            {f.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input name={f.name} defaultValue={value} className={inputClass} />
        )}
        {f.help && <p className="mt-1 text-xs text-[var(--text)]/40">{f.help}</p>}
      </div>
    );
  };

  return (
    <Shell
      profile={profile}
      active="projects"
      title={project.client_name}
      subtitle={`${serviceLabel(project.service)} · handed off by ${project.agent?.full_name ?? "—"}`}
    >
      {/* Status */}
      <Card title="Where it's at" description="Click to move it along." padded>
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((s) => {
            const current = s.value === status;
            return (
              <form key={s.value} action={setProjectStatus.bind(null, project.id, s.value)}>
                <button
                  type="submit"
                  className={
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                    (current
                      ? "bg-amber-600 text-[#0e0e0d]"
                      : "border border-[var(--border-strong)] text-[var(--text)]/80 hover:bg-[var(--hover)]")
                  }
                >
                  {s.label}
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      {intakeCard}

      {/* Form 2 — the production-ready brief */}
      <Card
        title="The brief — for production"
        description="Complete this properly before it goes out. Amber dot = pulled from the agent's handoff. Assign who's producing it too."
        padded
      >
        <form action={saveBrief.bind(null, project.id)} className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>Assigned to (production person)</label>
            <input
              name="designer"
              list="freelancer-list"
              defaultValue={project.designer ?? ""}
              placeholder="Pick a freelancer or type a name"
              className={inputClass}
            />
            <datalist id="freelancer-list">
              {freelancerNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          {fields.map(fieldInput)}
          <div>
            <button type="submit" className={btnPrimary}>
              Save brief
            </button>
          </div>
        </form>
      </Card>

      {/* Send to production */}
      <Card
        title="Send to production"
        description="Formatted for WhatsApp — the *asterisks* turn into bold when you paste. Save the brief first to update it."
        padded
      >
        <div className="rounded-lg border border-[var(--border)] bg-[var(--sunken)] p-3">
          <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text)]/80">
            {finishedBrief}
          </pre>
        </div>
        <div className="mt-3">
          <CopyButton
            text={finishedBrief}
            label="Copy brief for production"
            className={btnPrimary}
          />
        </div>
      </Card>

      {/* Danger zone */}
      <Card
        title="Danger zone"
        description="Deletes this project and its brief. There is no undo."
        padded
      >
        <DeleteProjectButton id={project.id} />
      </Card>
    </Shell>
  );
}
