"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const base =
  "font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors rounded-lg px-3.5 py-2";
const on = "bg-amber-600 text-[#140d05]";
const off =
  "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]";

// Window + agent controls for the dashboard Summary. Navigates via URL params
// so the whole summary re-renders server-side.
export function SummaryFilter({
  win,
  agent,
  agents,
  floor,
}: {
  win: string;
  agent?: string;
  agents: { id: string; full_name: string }[];
  floor: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();

  function go(patch: Record<string, string>) {
    const p = new URLSearchParams(sp.toString());
    p.set("view", "summary");
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${path}?${p.toString()}`, { scroll: false });
  }

  const windows = [
    ["day", "Day"],
    ["week", "Week"],
    ["month", "Month"],
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {windows.map(([w, label]) => (
          <button
            key={w}
            type="button"
            onClick={() => go({ win: w })}
            className={base + " " + (win === w ? on : off)}
          >
            {label}
          </button>
        ))}
      </div>
      {floor && (
        <select
          value={agent || ""}
          onChange={(e) => go({ agent: e.target.value })}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] outline-none"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
