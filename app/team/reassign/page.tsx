import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { ReassignLeads } from "@/components/reassign-leads";
import { revertTransferBatch } from "@/app/team/actions";

export const dynamic = "force-dynamic";

type Batch = {
  id: string;
  actor_id: string;
  kind: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  lead_count: number;
  created_at: string;
  reverted_at: string | null;
  reverted_by: string | null;
};

type ClientRow = {
  agent_id: string;
  handle_key: string;
  rep_handle: string;
  rep_name: string | null;
  rep_stage: string;
  outreach_count: number;
  rep_date_added: string;
};

export default async function ReassignPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    moved?: string;
    leads?: string;
    skipped?: string;
    err?: string;
    reverted?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { from, moved, leads, skipped, err, reverted } = await searchParams;
  const fromId = typeof from === "string" ? from : "";

  const [
    { data: usersData },
    { data: clientsData },
    { data: assignedData },
    { data: batchesData },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, active, role")
      .order("full_name"),
    supabase
      .from("lead_clients")
      .select(
        "agent_id, handle_key, rep_handle, rep_name, rep_stage, outreach_count, rep_date_added"
      ),
    supabase
      .from("leads")
      .select("handle_key, assigned_to, agent_id")
      .not("assigned_to", "is", null),
    supabase
      .from("lead_transfer_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const users = usersData ?? [];
  const clients = (clientsData ?? []) as ClientRow[];
  const nameById = new Map(users.map((u) => [u.id, u.full_name]));

  // Handle_keys each agent already works — plus ones already offered to them —
  // so the picker can flag overlaps and never double a client under one agent.
  const keysByAgent: Record<string, string[]> = {};
  for (const c of clients) {
    (keysByAgent[c.agent_id] ??= []).push(c.handle_key);
  }
  const assignedRows = (assignedData ?? []) as {
    handle_key: string;
    assigned_to: string;
    agent_id: string;
  }[];
  for (const r of assignedRows) {
    (keysByAgent[r.assigned_to] ??= []).push(r.handle_key);
  }

  // For the person being moved from: which of their clients are already offered
  // out (pending someone's acceptance), and to whom.
  const pendingName: Record<string, string> = {};
  if (fromId) {
    for (const r of assignedRows) {
      if (r.agent_id === fromId) {
        pendingName[r.handle_key] =
          nameById.get(r.assigned_to) ?? "another agent";
      }
    }
  }

  const fromClients = fromId
    ? clients
        .filter((c) => c.agent_id === fromId)
        .sort((a, b) => a.rep_handle.localeCompare(b.rep_handle))
    : [];

  const batches = (batchesData ?? []) as Batch[];

  const movedN = moved ? parseInt(moved, 10) : null;
  const skippedN = skipped ? parseInt(skipped, 10) : 0;
  const leadsN = leads ? parseInt(leads, 10) : 0;

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Shell
      profile={profile}
      active="team"
      title="Reassign leads"
      subtitle="Offer a departing person's clients to another agent — split them across agents however you like, without doubling anyone up. The receiving agent accepts them into their own list."
      action={
        <Link href="/team" className={btnSecondary}>
          ← Team
        </Link>
      }
    >
      {movedN !== null && (
        <div className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-5 py-3.5 text-sm text-[var(--text)]">
          Assigned <span className="font-semibold">{movedN}</span>{" "}
          {movedN === 1 ? "client" : "clients"}
          {leadsN > 0 && ` (${leadsN} lead${leadsN === 1 ? "" : "s"})`} to the new
          agent — they&apos;ll appear in that agent&apos;s{" "}
          <span className="font-medium">Assigned to me</span> inbox to accept.
          {skippedN > 0 && (
            <>
              {" "}
              Skipped{" "}
              <span className="font-semibold text-amber-600">{skippedN}</span>{" "}
              they already have.
            </>
          )}{" "}
          Select the next batch below to assign the rest.
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-[var(--negative)]/40 bg-[var(--surface)] px-5 py-3.5 text-sm text-[var(--negative)]">
          Nothing was moved — pick a person, a target agent, and at least one
          client.
        </div>
      )}

      {reverted && (
        <div className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-5 py-3.5 text-sm text-[var(--text)]">
          Transfer undone — those leads are back with their previous owner.
        </div>
      )}

      <ReassignLeads
        users={users}
        fromId={fromId}
        clients={fromClients}
        keysByAgent={keysByAgent}
        pendingName={pendingName}
      />

      <Card
        title="Transfer history"
        description="Every handoff is logged here. Undo restores each lead to its previous owner."
        padded={false}
      >
        {batches.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
            No transfers yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {batches.map((b) => {
              const revert = revertTransferBatch.bind(null, b.id);
              const fromName = b.from_agent_id
                ? nameById.get(b.from_agent_id) ?? "—"
                : "—";
              const toName = b.to_agent_id
                ? nameById.get(b.to_agent_id) ?? "—"
                : "—";
              const actor = nameById.get(b.actor_id) ?? "someone";
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0 text-sm">
                    <p className="text-[var(--text)]">
                      <span className="font-medium">
                        {b.kind === "accept" ? "Accepted" : "Assigned"}
                      </span>{" "}
                      <span className="font-mono text-[13px]">
                        {b.lead_count}
                      </span>{" "}
                      {b.lead_count === 1 ? "lead" : "leads"} · {fromName} →{" "}
                      {toName}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      {fmtWhen(b.created_at)} · by {actor}
                    </p>
                  </div>
                  {b.reverted_at ? (
                    <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-faint)]">
                      undone
                    </span>
                  ) : (
                    <form action={revert}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-amber-600 hover:text-amber-600"
                      >
                        Undo
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
