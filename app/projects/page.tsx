import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Avatar, btnPrimary } from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { SERVICES, serviceLabel } from "@/lib/intake";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_COLOR,
  projectStatusLabel,
} from "@/lib/production";

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

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string; editor?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const isOwner = profile.role === "owner";
  const { status, service, editor } = await searchParams;

  const statusOk = PROJECT_STATUSES.some((s) => s.value === status);
  const serviceOk = SERVICES.some((s) => s.value === service);
  const needsEditor = isOwner && editor === "1";
  const hasFilters = statusOk || serviceOk || needsEditor;

  let query = supabase
    .from("production_jobs")
    .select(
      "id, client_name, service, status, designer, deadline, created_at, agent:users(full_name, avatar_url)"
    )
    .order("created_at", { ascending: false });
  if (statusOk) {
    query = query.eq("status", status);
  } else {
    // Default "Active" view: hide the finished/dead ones so the list is just
    // what needs attention. Delivered & Lost are reachable via their pills.
    query = query.not("status", "in", "(delivered,lost)");
  }
  if (serviceOk) query = query.eq("service", service);
  if (needsEditor) query = query.is("designer", null);

  const { data } = await query;
  const projects = (data ?? []) as unknown as ProjectRow[];

  // Build a /projects URL from the current filters plus an override.
  const hrefWith = (patch: {
    status?: string | null;
    service?: string | null;
    editor?: string | null;
  }) => {
    const next = {
      status: "status" in patch ? patch.status : statusOk ? status : null,
      service: "service" in patch ? patch.service : serviceOk ? service : null,
      editor: "editor" in patch ? patch.editor : needsEditor ? "1" : null,
    };
    const sp = new URLSearchParams();
    if (next.status) sp.set("status", next.status);
    if (next.service) sp.set("service", next.service);
    if (next.editor) sp.set("editor", next.editor);
    const s = sp.toString();
    return s ? `/projects?${s}` : "/projects";
  };

  const pill = (active: boolean) =>
    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors " +
    (active
      ? "bg-amber-600 text-[#0e0e0d]"
      : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]");

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
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
          <Link href={hrefWith({ status: null })} className={pill(!statusOk)}>
            Active
          </Link>
          {PROJECT_STATUSES.map((s) => (
            <Link
              key={s.value}
              href={hrefWith({ status: s.value })}
              className={pill(statusOk && status === s.value)}
            >
              <span
                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ backgroundColor: PROJECT_STATUS_COLOR[s.value] }}
              />
              {s.label}
            </Link>
          ))}
          {isOwner && (
            <>
              <span className="mx-1 h-5 w-px bg-[var(--border-strong)]" />
              <Link
                href={hrefWith({ editor: needsEditor ? null : "1" })}
                className={
                  needsEditor
                    ? pill(true)
                    : "rounded-lg border border-amber-600/40 px-3.5 py-1.5 text-sm font-medium text-amber-500 transition-colors hover:bg-[var(--accent-soft)]"
                }
              >
                Needs an editor
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-3.5">
          <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Service
          </span>
          <Link href={hrefWith({ service: null })} className={pill(!serviceOk)}>
            All
          </Link>
          {SERVICES.map((s) => (
            <Link
              key={s.value}
              href={hrefWith({ service: s.value })}
              className={pill(serviceOk && service === s.value)}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </Card>

      {projects.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            emoji={hasFilters ? "🔍" : "📥"}
            title={hasFilters ? "No projects match these filters" : "No projects yet"}
            hint={
              hasFilters
                ? "Try a different status or service, or clear the filters."
                : "When you sign a client, collect their intake and hand the project off here."
            }
            actionHref={hasFilters ? "/projects" : "/projects/new"}
            actionLabel={hasFilters ? "Clear filters" : "+ New project"}
          />
        </Card>
      ) : (
        <Card
          padded={false}
          title={
            statusOk
              ? `${projects.length} ${projectStatusLabel(status!).toLowerCase()}`
              : `${projects.length} active`
          }
          description={
            !statusOk
              ? "Active work only — Delivered and Lost are under their own filters above."
              : undefined
          }
          action={
            hasFilters ? (
              <Link
                href="/projects"
                className="text-sm font-medium text-amber-600 hover:underline"
              >
                Clear
              </Link>
            ) : undefined
          }
        >
          <ul className="divide-y divide-[var(--border)]">
            {projects.map((p) => {
              const unassigned = !p.designer;
              const stColor = PROJECT_STATUS_COLOR[p.status] ?? "#8b8f96";
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
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stColor }}
                      />
                      <span style={{ color: stColor }}>
                        {projectStatusLabel(p.status)}
                      </span>
                    </span>
                    {isOwner && unassigned && (
                      <span className="rounded-full bg-amber-600/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                        Needs an editor
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-3 text-xs text-[var(--text)]/50">
                      {isOwner && p.designer && <span>🎨 {p.designer}</span>}
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
