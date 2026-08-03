"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { reassignLeads } from "@/app/team/actions";
import { btnPrimary, inputClass } from "@/components/ui";

type UserRow = {
  id: string;
  full_name: string;
  active: boolean;
  role: string;
};

type ClientRow = {
  handle_key: string;
  rep_handle: string;
  rep_name: string | null;
  rep_stage: string;
  outreach_count: number;
  rep_date_added: string;
};

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  in_conversation: "In conversation",
  qualified: "Qualified",
  closed: "Closed",
  lost: "Lost",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  team_lead: "Team Lead",
  agent: "Agent",
};

function userOption(u: UserRow) {
  return `${u.full_name || "(unnamed)"}${u.active ? "" : " · deactivated"}`;
}

export function ReassignLeads({
  users,
  fromId,
  clients,
  keysByAgent,
  pendingName,
}: {
  users: UserRow[];
  fromId: string;
  clients: ClientRow[];
  keysByAgent: Record<string, string[]>;
  pendingName: Record<string, string>;
}) {
  const router = useRouter();
  const [toId, setToId] = useState("");
  const [skip, setSkip] = useState(true);
  const [q, setQ] = useState("");
  const [firstN, setFirstN] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toKeys = useMemo(
    () => new Set(keysByAgent[toId] ?? []),
    [keysByAgent, toId]
  );
  const isOverlap = (k: string) => toId !== "" && toKeys.has(k);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter(
      (c) =>
        c.rep_handle.toLowerCase().includes(t) ||
        (c.rep_name ?? "").toLowerCase().includes(t)
    );
  }, [clients, q]);

  const selectedArr = [...selected];
  const overlapSelected = selectedArr.filter((k) => isOverlap(k)).length;
  const willMove = skip
    ? selectedArr.filter((k) => !isOverlap(k)).length
    : selectedArr.length;

  function toggle(k: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  function selectAllVisible() {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const c of visible) n.add(c.handle_key);
      return n;
    });
  }
  function clearAll() {
    setSelected(new Set());
  }
  function selectFirstN() {
    const n = parseInt(firstN, 10);
    if (!n || n < 1) return;
    const pick = new Set<string>();
    for (const c of visible) {
      if (pick.size >= n) break;
      if (skip && isOverlap(c.handle_key)) continue;
      pick.add(c.handle_key);
    }
    setSelected(pick);
  }

  const toName = users.find((u) => u.id === toId)?.full_name ?? "the agent";
  const canSubmit = toId !== "" && willMove > 0;

  const pill =
    "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      {/* Step 1 — who is leaving */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]">
          1 · Whose leads are moving
        </p>
        <select
          value={fromId}
          onChange={(e) =>
            router.push(
              e.target.value
                ? `/team/reassign?from=${e.target.value}`
                : "/team/reassign"
            )
          }
          className={inputClass + " mt-3 max-w-md"}
        >
          <option value="">Select the person…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {userOption(u)} · {ROLE_LABEL[u.role] ?? u.role}
            </option>
          ))}
        </select>
      </div>

      {fromId && clients.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center text-sm text-[var(--text-muted)]">
          This person has no leads to move.
        </div>
      )}

      {fromId && clients.length > 0 && (
        <form action={reassignLeads} className="flex flex-col gap-5">
          <input type="hidden" name="from" value={fromId} />
          <input type="hidden" name="to" value={toId} />
          <input type="hidden" name="skip" value={skip ? "on" : ""} />
          {selectedArr.map((k) => (
            <input key={k} type="hidden" name="keys" value={k} />
          ))}

          {/* Step 2 — target agent + duplicate guard */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]">
              2 · Assign the selected clients to
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className={inputClass + " max-w-xs"}
              >
                <option value="">Choose an agent…</option>
                {users
                  .filter((u) => u.id !== fromId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {userOption(u)}
                    </option>
                  ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={skip}
                  onChange={(e) => setSkip(e.target.checked)}
                  className="h-4 w-4 accent-amber-600"
                />
                Skip clients they already work (avoid duplicates)
              </label>
            </div>
            {toId && overlapSelected > 0 && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                <span className="font-medium text-amber-600">
                  {overlapSelected} selected
                </span>{" "}
                {overlapSelected === 1 ? "client is" : "clients are"} already
                owned by or offered to {toName} —{" "}
                {skip
                  ? "these will be left as-is, not assigned."
                  : "these WILL be assigned anyway."}
              </p>
            )}
          </div>

          {/* Step 3 — pick the batch */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search handle or name…"
                className={inputClass + " max-w-56"}
              />
              <button type="button" onClick={selectAllVisible} className={pill}>
                Select all{q ? " shown" : ""}
              </button>
              <button type="button" onClick={clearAll} className={pill}>
                Clear
              </button>
              <span className="mx-1 h-5 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[var(--text-muted)]">First</span>
                <input
                  value={firstN}
                  onChange={(e) =>
                    setFirstN(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  inputMode="numeric"
                  placeholder="100"
                  className={inputClass + " w-20 text-center"}
                />
                <button type="button" onClick={selectFirstN} className={pill}>
                  Select
                </button>
              </div>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {visible.map((c) => {
                const checked = selected.has(c.handle_key);
                const overlap = isOverlap(c.handle_key);
                const dimmed = overlap && skip;
                return (
                  <label
                    key={c.handle_key}
                    className={
                      "flex cursor-pointer items-center gap-3 border-t border-[var(--border-soft)] px-5 py-2.5 transition-colors first:border-t-0 hover:bg-[var(--sunken)] " +
                      (dimmed ? "opacity-55" : "")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.handle_key)}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                      {c.rep_handle}
                      {c.rep_name && (
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          · {c.rep_name}
                        </span>
                      )}
                    </span>
                    {c.outreach_count > 1 && (
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-faint)]">
                        {c.outreach_count} entries
                      </span>
                    )}
                    <span className="hidden shrink-0 text-xs text-[var(--text-muted)] sm:inline">
                      {STAGE_LABEL[c.rep_stage] ?? c.rep_stage}
                    </span>
                    {pendingName[c.handle_key] && (
                      <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-faint)]">
                        pending → {pendingName[c.handle_key]}
                      </span>
                    )}
                    {overlap && (
                      <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-600">
                        already has
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer — confirm */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">
                {willMove}
              </span>{" "}
              {willMove === 1 ? "client" : "clients"} will be assigned
              {skip && overlapSelected > 0 && ` · ${overlapSelected} skipped`}
              {" · "}
              {clients.length} total on this person
            </p>
            <button type="submit" disabled={!canSubmit} className={btnPrimary}>
              Assign {willMove || ""} to {toName}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
