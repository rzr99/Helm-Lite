"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, EmptyState, Avatar, inputClass } from "@/components/ui";
import { stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";

const filterLabel =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export type LeadRow = {
  id: string;
  handle: string;
  name: string | null;
  service_interest: string | null;
  source: string | null;
  stage: string;
  date_added: string;
  agent: { full_name: string; avatar_url: string | null } | null;
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
        const hay = `${l.name ?? ""} ${l.handle}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
    : leads;

  return (
    <Card
      title={`${visible.length} lead${visible.length === 1 ? "" : "s"}${
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

      {visible.length === 0 ? (
        tokens.length ? (
          <EmptyState
            emoji="🔍"
            title={`No leads match “${q.trim()}”`}
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
                <th className="px-5 py-3 font-semibold">Lead</th>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                {floor && <th className="px-5 py-3 font-semibold">Agent</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visible.map((lead) => (
                <tr
                  key={lead.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {lead.handle}
                    </Link>
                    {lead.name && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {lead.name}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    {serviceLabel(lead.service_interest)}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    {lead.source ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (STAGE_BADGE[lead.stage] ?? "")
                      }
                    >
                      {stageLabel(lead.stage)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    {lead.date_added}
                  </td>
                  {floor && (
                    <td className="px-5 py-3.5">
                      {lead.agent ? (
                        <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <Avatar
                            name={lead.agent.full_name}
                            src={lead.agent.avatar_url}
                            size={7}
                          />
                          {lead.agent.full_name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
