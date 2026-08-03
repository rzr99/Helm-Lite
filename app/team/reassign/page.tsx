import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { btnSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { ReassignLeads } from "@/components/reassign-leads";

export const dynamic = "force-dynamic";

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
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { from, moved, leads, skipped, err } = await searchParams;
  const fromId = typeof from === "string" ? from : "";

  const [{ data: usersData }, { data: clientsData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, active, role")
      .order("full_name"),
    supabase
      .from("lead_clients")
      .select(
        "agent_id, handle_key, rep_handle, rep_name, rep_stage, outreach_count, rep_date_added"
      ),
  ]);

  const users = usersData ?? [];
  const clients = (clientsData ?? []) as ClientRow[];

  // Handle_keys each agent already works — the client uses this to flag overlaps.
  const keysByAgent: Record<string, string[]> = {};
  for (const c of clients) {
    (keysByAgent[c.agent_id] ??= []).push(c.handle_key);
  }

  const fromClients = fromId
    ? clients
        .filter((c) => c.agent_id === fromId)
        .sort((a, b) => a.rep_handle.localeCompare(b.rep_handle))
    : [];

  const movedN = moved ? parseInt(moved, 10) : null;
  const skippedN = skipped ? parseInt(skipped, 10) : 0;
  const leadsN = leads ? parseInt(leads, 10) : 0;

  return (
    <Shell
      profile={profile}
      active="team"
      title="Reassign leads"
      subtitle="Move a departing person's clients to another agent — split them across agents however you like, without doubling anyone up."
      action={
        <Link href="/team" className={btnSecondary}>
          ← Team
        </Link>
      }
    >
      {movedN !== null && (
        <div className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-5 py-3.5 text-sm text-[var(--text)]">
          Moved <span className="font-semibold">{movedN}</span>{" "}
          {movedN === 1 ? "client" : "clients"}
          {leadsN > 0 && ` (${leadsN} lead${leadsN === 1 ? "" : "s"})`} to the new
          agent.
          {skippedN > 0 && (
            <>
              {" "}
              Skipped{" "}
              <span className="font-semibold text-amber-600">{skippedN}</span>{" "}
              already worked by them.
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

      <ReassignLeads
        users={users}
        fromId={fromId}
        clients={fromClients}
        keysByAgent={keysByAgent}
      />
    </Shell>
  );
}
