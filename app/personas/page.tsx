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

type Account = { id: string; platform: string; handle: string; status: string };

type PersonaRow = {
  id: string;
  persona_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  manager: { full_name: string; avatar_url: string | null } | null;
  accounts: Account[];
};

// The colour a row takes: its worst (most attention-needing) account status.
function worstStatus(accounts: Account[]): string | null {
  if (!accounts.length) return null;
  for (const s of STATUS_SEVERITY) {
    if (accounts.some((a) => a.status === s)) return s;
  }
  return accounts[0].status;
}

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { status } = await searchParams;
  const activeStatus =
    status && ACCOUNT_STATUSES.some((s) => s.value === status) ? status : null;

  const [{ data: personasData }, { data: platforms }] = await Promise.all([
    supabase
      .from("personas")
      .select(
        "id, persona_name, contact_email, contact_phone, manager:users(full_name, avatar_url), accounts(id, platform, handle, status)"
      )
      .order("persona_name"),
    supabase.from("platforms").select("name").order("name"),
  ]);

  const personas = (personasData ?? []) as unknown as PersonaRow[];

  // Count accounts per status across everything (drives the filter chips).
  const counts: Record<string, number> = {};
  for (const p of personas)
    for (const a of p.accounts ?? [])
      counts[a.status] = (counts[a.status] ?? 0) + 1;

  // When a status is picked, keep only personas that have such an account, and
  // colour those rows by that status; otherwise colour by the worst account.
  const rows = personas
    .map((p) => {
      const accounts = p.accounts ?? [];
      const matching = activeStatus
        ? accounts.filter((a) => a.status === activeStatus)
        : accounts;
      const tintStatus = activeStatus ?? worstStatus(accounts);
      return { ...p, accounts, matchingCount: matching.length, tintStatus };
    })
    .filter((p) => !activeStatus || p.matchingCount > 0);

  const presentStatuses = ACCOUNT_STATUSES.filter((s) => counts[s.value] > 0);

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
        {/* Health filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">
          <Link
            href="/personas"
            className={
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
              (!activeStatus
                ? "bg-amber-600 text-[#0e0e0d]"
                : "border border-zinc-300 text-zinc-600 hover:border-amber-500/70 dark:border-white/15 dark:text-zinc-300")
            }
          >
            All
          </Link>
          {presentStatuses.map((s) => (
            <Link
              key={s.value}
              href={`/personas?status=${s.value}`}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
                (activeStatus === s.value
                  ? "bg-amber-600 text-[#0e0e0d]"
                  : "border border-zinc-300 text-zinc-600 hover:border-amber-500/70 dark:border-white/15 dark:text-zinc-300")
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
            emoji={activeStatus ? "🔍" : "🎭"}
            title={
              activeStatus
                ? `No ${statusLabel(activeStatus).toLowerCase()} accounts`
                : "No personas yet"
            }
            hint={
              activeStatus
                ? "Nothing in this state right now — try another filter."
                : "A persona is an operating identity — create one and add its accounts."
            }
            actionHref={activeStatus ? undefined : "/personas/new"}
            actionLabel={activeStatus ? undefined : "+ New persona"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
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
                    <td className="px-5 py-3.5">
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
                        <span className="text-zinc-400">no accounts</span>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                          {p.accounts
                            .slice()
                            .sort((a, b) => a.platform.localeCompare(b.platform))
                            .map((a) => (
                              <span
                                key={a.id}
                                title={`${a.handle || a.platform} — ${statusLabel(a.status)}`}
                                className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-200"
                              >
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                                  style={{
                                    backgroundColor: STATUS_DOT[a.status] ?? "#71717a",
                                  }}
                                />
                                {a.platform}
                              </span>
                            ))}
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
