"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, EmptyState, Avatar, inputClass } from "@/components/ui";
import { stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export type LeadRow = {
  id: string;
  agent_id: string;
  handle: string;
  name: string | null;
  service_interest: string | null;
  source: string | null;
  stage: string;
  date_added: string;
  persona: string | null;
  agent: { full_name: string; avatar_url: string | null } | null;
};

// A client the agent worked, plus every outreach (account/persona) they used.
type Group = {
  key: string;
  rep: LeadRow; // most-recent entry, drives the shared columns
  entries: LeadRow[]; // one per outreach, newest first
};

export function LeadsLive({
  leads,
  floor,
  hasServerFilters,
}: {
  leads: LeadRow[];
  floor: boolean;
  hasServerFilters: boolean;
}) {
  const [q, setQ] = useState("");

  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visible = tokens.length
    ? leads.filter((l) => {
        const hay = `${l.name ?? ""} ${l.handle} ${l.persona ?? ""}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
    : leads;

  // Collapse the same client (same handle) worked by the SAME agent into one
  // row — that's normal multi-persona outreach, not 8 separate clients. Two
  // DIFFERENT agents on one handle stay separate (that's a real clash).
  const groupMap = new Map<string, LeadRow[]>();
  for (const l of visible) {
    const key = `${l.agent_id}|${l.handle.trim().toLowerCase()}`;
    const arr = groupMap.get(key) ?? [];
    arr.push(l);
    groupMap.set(key, arr);
  }
  const groups: Group[] = [...groupMap.entries()]
    .map(([key, entries]) => {
      const sorted = [...entries].sort((a, b) =>
        b.date_added.localeCompare(a.date_added)
      );
      return { key, rep: sorted[0], entries: sorted };
    })
    .sort((a, b) => b.rep.date_added.localeCompare(a.rep.date_added));

  return (
    <Card
      title={`${groups.length} client${groups.length === 1 ? "" : "s"}${
        tokens.length ? " found" : ""
      }`}
      padded={false}
    >
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <label className={filterLabel}>Search name or handle</label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a client's name…"
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {groups.length === 0 ? (
        tokens.length ? (
          <EmptyState
            emoji="🔍"
            title={`No clients match “${q.trim()}”`}
            hint="Try just the first name, or check the spelling."
          />
        ) : hasServerFilters ? (
          <EmptyState
            emoji="🔍"
            title="Nothing matches these filters"
            hint="Try widening the date range or clearing a filter."
          />
        ) : (
          <EmptyState
            emoji="🌱"
            title="No leads yet"
            hint="Add your first lead and it will show up here."
            actionHref="/leads/new"
            actionLabel="+ Add lead"
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Client</th>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                {floor && <th className="px-5 py-3 font-semibold">Agent</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {groups.map(({ key, rep, entries }) => {
                const multi = entries.length > 1;
                return (
                  <tr
                    key={key}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3.5 align-top">
                      <Link
                        href={`/leads/${rep.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {rep.handle}
                      </Link>
                      {!multi && rep.name && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {rep.name}
                        </p>
                      )}
                      {multi && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            Reached from:
                          </span>
                          {entries.map((e) => (
                            <Link
                              key={e.id}
                              href={`/leads/${e.id}`}
                              title={`Added ${e.date_added}`}
                              className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:border-amber-500 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:text-amber-400"
                            >
                              {e.persona || e.name || e.date_added}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 align-top text-zinc-600 dark:text-zinc-400">
                      {serviceLabel(rep.service_interest)}
                    </td>
                    <td className="px-5 py-3.5 align-top text-zinc-600 dark:text-zinc-400">
                      {rep.source ?? "—"}
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
                    <td className="px-5 py-3.5 align-top text-zinc-600 dark:text-zinc-400">
                      {rep.date_added}
                    </td>
                    {floor && (
                      <td className="px-5 py-3.5 align-top">
                        {rep.agent ? (
                          <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                            <Avatar
                              name={rep.agent.full_name}
                              src={rep.agent.avatar_url}
                              size={7}
                            />
                            {rep.agent.full_name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
