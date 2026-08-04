import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Avatar, btnPrimary } from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { serviceLabel } from "@/lib/intake";
import { projectStatusLabel } from "@/lib/production";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  client_name: string;
  service: string;
  status: string;
  designer: string | null;
  deadline: string | null;
  created_at: string;
  agent: { full_name: string; avatar_url: string | null } | null;
};

export default async function ProjectsPage() {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);

  const { data } = await supabase
    .from("production_jobs")
    .select(
      "id, client_name, service, status, designer, deadline, created_at, agent:users(full_name, avatar_url)"
    )
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as unknown as ProjectRow[];

  return (
    <Shell
      profile={profile}
      active="projects"
      title="Production"
      subtitle={
        floor
          ? "Client work handed off from the floor. Assign an editor and move it along."
          : "The projects you've handed off, and where they are."
      }
      action={
        <Link href="/projects/new" className={btnPrimary}>
          + New project
        </Link>
      }
    >
      {projects.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            emoji="📥"
            title="No projects yet"
            hint="When you sign a client, collect their intake and hand the project off here."
            actionHref="/projects/new"
            actionLabel="+ New project"
          />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-[var(--border)]">
            {projects.map((p) => {
              const unassigned = !p.designer;
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-[var(--sunken)]"
                  >
                    <span className="font-semibold text-[var(--text)]">
                      {p.client_name}
                    </span>
                    <span className="rounded-full bg-[var(--hover)] px-2.5 py-0.5 text-xs text-[var(--text)]/80">
                      {serviceLabel(p.service)}
                    </span>
                    <span className="text-xs text-[var(--text)]/50">
                      {projectStatusLabel(p.status)}
                    </span>
                    {floor && unassigned && (
                      <span className="rounded-full bg-amber-600/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                        Needs an editor
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-3 text-xs text-[var(--text)]/50">
                      {p.designer && <span>🎨 {p.designer}</span>}
                      {p.deadline && <span>{p.deadline}</span>}
                      {floor && p.agent && (
                        <Avatar
                          name={p.agent.full_name}
                          src={p.agent.avatar_url}
                          size={7}
                        />
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </Shell>
  );
}
