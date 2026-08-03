import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, btnPrimary, btnSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";
import { acceptAssignedLeads } from "@/app/leads/actions";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  handle: string;
  name: string | null;
  stage: string;
  service_interest: string | null;
  source: string | null;
  date_added: string;
  handle_key: string;
  agent_id: string;
};

export default async function AssignedLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { accepted } = await searchParams;

  const { data } = await supabase
    .from("leads")
    .select(
      "id, handle, name, stage, service_interest, source, date_added, handle_key, agent_id"
    )
    .eq("assigned_to", profile.id)
    .order("date_added", { ascending: false });

  const rows = (data ?? []) as LeadRow[];

  // Names of the people who handed these over. Uses a security-definer lookup
  // so an agent (who can't read other users' rows) still sees who sent them.
  const { data: dirData } = await supabase.rpc("user_directory");
  const nameById = new Map(
    ((dirData ?? []) as { id: string; full_name: string }[]).map((u) => [
      u.id,
      u.full_name,
    ])
  );

  // One row per client (handle_key); the latest outreach represents it.
  const byKey = new Map<string, { rep: LeadRow; count: number }>();
  for (const r of rows) {
    const ex = byKey.get(r.handle_key);
    if (!ex) byKey.set(r.handle_key, { rep: r, count: 1 });
    else ex.count += 1;
  }
  const clients = [...byKey.values()];

  return (
    <Shell
      profile={profile}
      active="leads"
      title="Assigned to me"
      subtitle="Leads another agent handed to you. Accept them into your own list — all at once or one at a time — or open one to work it right here first."
      action={
        <Link href="/leads" className={btnSecondary}>
          ← My leads
        </Link>
      }
    >
      {accepted && (
        <div className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-5 py-3.5 text-sm text-[var(--text)]">
          Added to your leads. They now count as yours and appear in{" "}
          <Link href="/leads" className="font-semibold text-amber-600 hover:underline">
            My leads
          </Link>
          .
        </div>
      )}

      <Card
        title={`${clients.length} client${clients.length === 1 ? "" : "s"} assigned to you`}
        description="Accepting adds them to your own leads. Until then they stay separate from your numbers."
        action={
          clients.length > 0 ? (
            <form action={acceptAssignedLeads}>
              <input type="hidden" name="all" value="on" />
              <button type="submit" className={btnPrimary}>
                Accept all {clients.length}
              </button>
            </form>
          ) : undefined
        }
        padded={false}
      >
        {clients.length === 0 ? (
          <EmptyState
            emoji="📥"
            title="Nothing assigned to you"
            hint="When someone transfers their leads to you, they'll land here for you to accept."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Stage</th>
                  <th className="px-5 py-3 font-semibold">From</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {clients.map(({ rep, count }) => (
                  <tr key={rep.handle_key} className="transition-colors hover:bg-[var(--sunken)]">
                    <td className="px-5 py-3.5 align-top">
                      <Link
                        href={`/leads/${rep.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {rep.handle}
                      </Link>
                      {rep.name && (
                        <p className="text-xs text-[var(--text-muted)]">{rep.name}</p>
                      )}
                      {count > 1 && (
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--text-faint)]">
                          {count} entries
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-top text-[var(--text-muted)]">
                      {serviceLabel(rep.service_interest)}
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (STAGE_BADGE[rep.stage] ?? "")
                        }
                      >
                        {stageLabel(rep.stage)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 align-top text-[var(--text-muted)]">
                      {nameById.get(rep.agent_id) ?? "another agent"}
                    </td>
                    <td className="px-5 py-3.5 align-top text-right">
                      <form action={acceptAssignedLeads}>
                        <input type="hidden" name="keys" value={rep.handle_key} />
                        <button
                          type="submit"
                          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-amber-600 hover:text-amber-600"
                        >
                          Add to my leads
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
