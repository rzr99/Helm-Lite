import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  btnPrimary,
  inputClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { addPlatform } from "@/app/personas/actions";
import {
  ACCOUNT_STATUSES,
  STATUS_DOT,
  STATUS_TINT,
  STATUS_SEVERITY,
  statusLabel,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

type Account = {
  id: string;
  platform: string;
  handle: string;
  statuses: string[];
};

type PersonaRow = {
  id: string;
  persona_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  manager: { full_name: string; avatar_url: string | null } | null;
  accounts: Account[];
};

// The colour a row takes: its worst (most attention-needing) status across all
// of its accounts (each account can carry several states at once).
function worstStatus(accounts: Account[]): string | null {
  const all = accounts.flatMap((a) => a.statuses ?? []);
  if (!all.length) return null;
  for (const s of STATUS_SEVERITY) {
    if (all.includes(s)) return s;
  }
  return all[0];
}

type AssignFilter = "assigned" | "unassigned" | "all";

// Build a /personas URL that keeps the OTHER axis intact, so the two filter
// rows stack instead of resetting each other. "assigned" is the default view,
// so it's left out of the URL to keep /personas clean.
function personasHref(assign: AssignFilter, status: string | null): string {
  const params = new URLSearchParams();
  if (assign !== "assigned") params.set("assign", assign);
  if (status) params.set("status", status);
  const qs = params.toString();
  return "/personas" + (qs ? `?${qs}` : "");
}

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assign?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { status, assign } = await searchParams;
  const activeStatus =
    status && ACCOUNT_STATUSES.some((s) => s.value === status) ? status : null;
  // Assignment is a persona-level axis (who runs it), independent of account
  // health. Default to "assigned" so the page opens on the working roster.
  const activeAssign: AssignFilter =
    assign === "unassigned" ? "unassigned" : assign === "all" ? "all" : "assigned";

  const [{ data: personasData }, { data: platforms }] = await Promise.all([
    supabase
      .from("personas")
      .select(
        "id, persona_name, contact_email, contact_phone, manager:users(full_name, avatar_url), accounts(id, platform, handle, statuses)"
      )
      .order("persona_name"),
    supabase.from("platforms").select("name").order("name"),
  ]);

  const personas = (personasData ?? []) as unknown as PersonaRow[];

  const isAssigned = (p: PersonaRow) => p.manager != null;
  const matchesAssign = (p: PersonaRow) =>
    activeAssign === "all"
      ? true
      : activeAssign === "assigned"
        ? isAssigned(p)
        : !isAssigned(p);
  // Does this persona have an account in the currently-picked health state?
  // (Used so the assignment counts reflect the active health filter.)
  const inHealth = (p: PersonaRow) =>
    !activeStatus ||
    (p.accounts ?? []).some((a) => (a.statuses ?? []).includes(activeStatus));

  // Assignment chips count PERSONAS, narrowed by the active health filter.
  let assignedCount = 0;
  let unassignedCount = 0;
  for (const p of personas) {
    if (!inHealth(p)) continue;
    if (isAssigned(p)) assignedCount++;
    else unassignedCount++;
  }

  // Health chips count ACCOUNTS, narrowed by the active assignment filter, so
  // the numbers always describe what you're currently looking at. An account
  // with several states counts toward each one.
  const counts: Record<string, number> = {};
  for (const p of personas) {
    if (!matchesAssign(p)) continue;
    for (const a of p.accounts ?? [])
      for (const s of a.statuses ?? [])
        counts[s] = (counts[s] ?? 0) + 1;
  }

  // Apply assignment first, then health: keep personas with a matching account
  // and colour those rows by it; otherwise colour by the worst account.
  const rows = personas
    .filter(matchesAssign)
    .map((p) => {
      const accounts = p.accounts ?? [];
      const matching = activeStatus
        ? accounts.filter((a) => (a.statuses ?? []).includes(activeStatus))
        : accounts;
      const tintStatus = activeStatus ?? worstStatus(accounts);
      return { ...p, accounts, matchingCount: matching.length, tintStatus };
    })
    .filter((p) => !activeStatus || p.matchingCount > 0);

  const presentStatuses = ACCOUNT_STATUSES.filter((s) => counts[s.value] > 0);

  const assignFilters: { value: AssignFilter; label: string; count: number }[] = [
    { value: "assigned", label: "Assigned", count: assignedCount },
    { value: "unassigned", label: "Unassigned", count: unassignedCount },
    { value: "all", label: "All", count: assignedCount + unassignedCount },
  ];

  return (
    <Shell
      profile={profile}
      active="personas"
      title="Personas & accounts"
      subtitle="Owner-only. The identities your team operates and the health of every account behind them."
      action={
        <Link href="/personas/new" className={btnPrimary}>
          + New persona
        </Link>
      }
    >
      <Card padded={false}>
        {/* Assignment (who runs it) — the primary "where do I look" split. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
          <span className="mr-1 w-14 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
            Team
          </span>
          {assignFilters.map((f) => (
            <Link
              key={f.value}
              href={personasHref(f.value, activeStatus)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
                (activeAssign === f.value
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              {f.label}
              <span className="opacity-60">{f.count}</span>
            </Link>
          ))}
        </div>

        {/* Health (what's wrong) — a second lens stacked on the assignment view. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
          <span className="mr-1 w-14 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
            Health
          </span>
          <Link
            href={personasHref(activeAssign, null)}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
              (!activeStatus
                ? "bg-amber-600 text-[#0e0e0d]"
                : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
            }
          >
            All
          </Link>
          {presentStatuses.map((s) => (
            <Link
              key={s.value}
              href={personasHref(activeAssign, s.value)}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
                (activeStatus === s.value
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_DOT[s.value] ?? "#71717a" }}
              />
              {s.label}
              <span className="opacity-60">{counts[s.value]}</span>
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            emoji={personas.length === 0 ? "🎭" : "🔍"}
            title={
              personas.length === 0
                ? "No personas yet"
                : activeStatus
                  ? `No ${statusLabel(activeStatus).toLowerCase()} accounts here`
                  : activeAssign === "unassigned"
                    ? "No unassigned personas"
                    : activeAssign === "assigned"
                      ? "No assigned personas"
                      : "Nothing matches this filter"
            }
            hint={
              personas.length === 0
                ? "A persona is an operating identity — create one and add its accounts."
                : "Nothing in this view right now — try another filter."
            }
            actionHref={personas.length === 0 ? "/personas/new" : undefined}
            actionLabel={personas.length === 0 ? "+ New persona" : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Run by</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    style={
                      p.tintStatus
                        ? { backgroundColor: STATUS_TINT[p.tintStatus] }
                        : undefined
                    }
                    className="transition-colors"
                  >
                    <td
                      className="py-3.5 pl-5 pr-5"
                      style={
                        p.tintStatus
                          ? {
                              boxShadow: `inset 3px 0 0 0 ${STATUS_DOT[p.tintStatus]}`,
                            }
                          : undefined
                      }
                    >
                      <Link
                        href={`/personas/${p.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {p.persona_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.manager ? (
                        <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <Avatar
                            name={p.manager.full_name}
                            src={p.manager.avatar_url}
                            size={7}
                          />
                          {p.manager.full_name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {p.contact_email ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {p.contact_phone ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.accounts.length === 0 ? (
                        <span className="text-[var(--text-faint)]">no accounts</span>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                          {p.accounts
                            .slice()
                            .sort((a, b) => a.platform.localeCompare(b.platform))
                            .map((a) => {
                              const sts = (a.statuses ?? []).length
                                ? a.statuses
                                : ["active"];
                              return (
                                <span
                                  key={a.id}
                                  title={`${a.handle || a.platform} — ${sts.map(statusLabel).join(", ")}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text)]"
                                >
                                  <span className="flex gap-0.5">
                                    {sts.map((s, i) => (
                                      <span
                                        key={i}
                                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                                        style={{
                                          backgroundColor: STATUS_DOT[s] ?? "#71717a",
                                        }}
                                      />
                                    ))}
                                  </span>
                                  {a.platform}
                                </span>
                              );
                            })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Platforms"
        description="The dropdown options for accounts. Adding one here is all it takes — no rebuild needed."
      >
        <div className="flex flex-wrap items-center gap-2">
          {(platforms ?? []).map((p) => (
            <span
              key={p.name}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {p.name}
            </span>
          ))}
        </div>
        <form action={addPlatform} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            name="name"
            placeholder="new platform, e.g. telegram"
            className={inputClass + " max-w-60"}
          />
          <button type="submit" className={btnPrimary}>
            Add platform
          </button>
        </form>
      </Card>
    </Shell>
  );
}
