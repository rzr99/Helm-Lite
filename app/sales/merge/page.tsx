import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, EmptyState, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { fmtMoney } from "@/lib/enums";
import {
  mergeDeals,
  mergeAllObvious,
  undoMerge,
} from "@/app/sales/merge/actions";
import { clientKey } from "@/lib/sales";

export const dynamic = "force-dynamic";

type Deal = {
  id: string;
  client_name: string;
  lead_id: string | null;
  agent_id: string;
  service: string | null;
  deal_size: number;
  revenue_received: number;
  date_closed: string;
  created_at: string;
  agent: { full_name: string } | null;
};

const nameKey = clientKey;

// Same client + same agent + same total: the old form re-entered the full total
// with every payment, so these are certainly one sale.
function obviousCount(deals: Deal[]) {
  const counts = new Map<string, number>();
  for (const d of deals) {
    const k = `${nameKey(d.client_name)}|${d.agent_id}|${Number(d.deal_size)}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let groups = 0;
  let rows = 0;
  for (const n of counts.values())
    if (n > 1) {
      groups++;
      rows += n;
    }
  return { groups, rows };
}

// Group sales that look like one sale logged several times: same client name
// (word set) or same lead. Union-find so the two signals chain together.
function suggestGroups(deals: Deal[]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const firstBy = new Map<string, string>();
  for (const d of deals) {
    for (const k of [
      "n:" + nameKey(d.client_name),
      d.lead_id ? "l:" + d.lead_id : "",
    ]) {
      if (!k || k === "n:") continue;
      const seen = firstBy.get(k);
      if (seen) union(d.id, seen);
      else firstBy.set(k, d.id);
    }
  }

  const groups = new Map<string, Deal[]>();
  for (const d of deals) {
    const r = find(d.id);
    groups.set(r, [...(groups.get(r) ?? []), d]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      g.sort(
        (a, b) =>
          a.date_closed.localeCompare(b.date_closed) ||
          a.created_at.localeCompare(b.created_at)
      )
    )
    .sort((a, b) =>
      b[b.length - 1].date_closed.localeCompare(a[a.length - 1].date_closed)
    );
}

function GroupForm({ deals, label }: { deals: Deal[]; label: string }) {
  const keep = deals[0];
  const received = deals.reduce((s, d) => s + Number(d.revenue_received), 0);
  const remaining = Number(keep.deal_size) - received;
  const agents = new Set(deals.map((d) => d.agent_id));

  return (
    <Card title={label} padded={false}>
      <form action={mergeDeals}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Merge</th>
                <th className="px-4 py-2.5 font-semibold">Keep</th>
                <th className="px-4 py-2.5 font-semibold">Client</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Sale</th>
                <th className="px-4 py-2.5 font-semibold">Received</th>
                <th className="px-4 py-2.5 font-semibold">Service</th>
                <th className="px-4 py-2.5 font-semibold">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {deals.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      name="ids"
                      value={d.id}
                      defaultChecked
                      className="h-4 w-4 accent-amber-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="radio"
                      name="keep"
                      value={d.id}
                      defaultChecked={d.id === keep.id}
                      className="h-4 w-4 accent-amber-600"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Link
                      href={`/sales/${d.id}`}
                      className="font-medium text-[var(--text)] hover:underline"
                    >
                      {d.client_name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-[var(--text-muted)]">
                    {d.date_closed}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--text-muted)]">
                    {fmtMoney(Number(d.deal_size))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold tabular-nums text-[var(--text)]">
                    {fmtMoney(Number(d.revenue_received))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-muted)]">
                    {d.service ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-muted)]">
                    {d.agent?.full_name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--sunken)] px-4 py-3">
          <p className="text-sm text-[var(--text-muted)]">
            If all are merged into the first:{" "}
            <span className="text-[var(--text)]">
              sale {fmtMoney(Number(keep.deal_size))} · received{" "}
              {fmtMoney(received)} ·{" "}
              {remaining > 0
                ? `still owed ${fmtMoney(remaining)}`
                : remaining < 0
                  ? `over-paid by ${fmtMoney(-remaining)} — check the sale amount`
                  : "paid in full"}
            </span>
            {agents.size > 1 && (
              <span className="mt-1 block text-amber-600">
                Different agents on these rows. The merged sale belongs to the
                agent of the one you keep.
              </span>
            )}
          </p>
          <button type="submit" className={btnPrimary}>
            Merge into one sale
          </button>
        </div>
      </form>
    </Card>
  );
}

export default async function MergeSalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    merged?: string;
    undone?: string;
    all?: string;
  }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/sales");
  const { q, merged, undone, all } = await searchParams;
  const search = (q ?? "").trim();

  const [{ data: dealData }, { data: mergeData }] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "id, client_name, lead_id, agent_id, service, deal_size, revenue_received, date_closed, created_at, agent:users(full_name)"
      )
      .order("date_closed")
      .limit(100000),
    supabase
      .from("deal_merges")
      .select("id, kept_deal_id, removed_deals, created_at, undone_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const deals = (dealData ?? []) as unknown as Deal[];
  const groups = suggestGroups(deals);
  const obvious = obviousCount(deals);
  const searchHits = search
    ? deals.filter((d) =>
        d.client_name.toLowerCase().includes(search.toLowerCase())
      )
    : [];
  const nameById = new Map(deals.map((d) => [d.id, d.client_name]));
  const merges = (mergeData ?? []) as {
    id: string;
    kept_deal_id: string;
    removed_deals: { client_name: string }[];
    created_at: string;
    undone_at: string | null;
  }[];

  return (
    <Shell
      profile={profile}
      active="sales"
      title="Merge duplicate sales"
      subtitle="Owner only. Combine a sale that was logged once per payment into one sale."
      action={
        <Link
          href="/sales?view=unpaid"
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← Back to sales
        </Link>
      }
    >
      {merged && (
        <p className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text)]">
          Merged. All payments are now on one sale. Changed your mind? Use Undo
          under Recent merges.
        </p>
      )}
      {all && (
        <p className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text)]">
          Merged {all} sale{all === "1" ? "" : "s"} that had been logged once per
          payment. Each one is listed under Recent merges with its own Undo.
        </p>
      )}
      {obvious.groups > 0 && (
        <Card padded>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium text-[var(--text)]">
                {obvious.groups} sale{obvious.groups === 1 ? " was" : "s were"}{" "}
                logged more than once ({obvious.rows} rows)
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Same client, same agent and same sale total. Merge them all in
                one click. Every payment keeps its own date, and each merge can
                be undone.
              </p>
            </div>
            <form action={mergeAllObvious}>
              <button type="submit" className={btnPrimary}>
                Merge all {obvious.groups}
              </button>
            </form>
          </div>
        </Card>
      )}
      {undone && (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          Merge undone. The sales are back as they were.
        </p>
      )}

      <Card padded>
        <div className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
          <p>
            <span className="font-medium text-[var(--text)]">How it works:</span>{" "}
            tick the rows that are really the same sale, choose which one to{" "}
            <span className="font-medium text-[var(--text)]">Keep</span> (its
            sale amount, date and details stay), and click Merge. Every payment
            from the other rows moves onto it and the extra rows disappear. Each
            payment keeps its own date, so monthly totals don&apos;t change.
          </p>
          <p>
            Untick a row if it&apos;s a genuinely separate sale (a repeat client
            buying again). Every merge can be undone.
          </p>
        </div>
        <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Not suggested below? Search a client name…"
            className={inputClass + " max-w-sm"}
          />
          <button type="submit" className={btnSecondary}>
            Search
          </button>
        </form>
      </Card>

      {search &&
        (searchHits.length < 2 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {searchHits.length === 0
              ? `No sales match "${search}".`
              : `Only one sale matches "${search}" — nothing to merge.`}
          </p>
        ) : (
          <GroupForm deals={searchHits} label={`Search: "${search}"`} />
        ))}

      {groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            emoji="✅"
            title="No duplicate sales found"
            hint="Nothing looks logged twice. Use the search above if one was named differently."
          />
        </Card>
      ) : (
        <>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {groups.length} possible duplicate{groups.length === 1 ? "" : "s"}{" "}
            · same client name or same lead
          </p>
          {groups.map((g) => (
            <GroupForm key={g[0].id} deals={g} label={g[0].client_name} />
          ))}
        </>
      )}

      {merges.length > 0 && (
        <Card title="Recent merges" padded={false}>
          {merges.map((m) => {
            const undo = undoMerge.bind(null, m.id);
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-5 py-2.5 text-sm first:border-t-0"
              >
                <p className="min-w-0 truncate text-[var(--text)]">
                  {nameById.get(m.kept_deal_id) ??
                    m.removed_deals[0]?.client_name ??
                    "Sale"}
                  <span className="ml-2 text-[var(--text-faint)]">
                    {m.removed_deals.length} row
                    {m.removed_deals.length === 1 ? "" : "s"} merged in ·{" "}
                    {m.created_at.slice(0, 10)}
                  </span>
                </p>
                {m.undone_at ? (
                  <span className="text-xs text-[var(--text-faint)]">undone</span>
                ) : (
                  <form action={undo}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      Undo
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </Shell>
  );
}
