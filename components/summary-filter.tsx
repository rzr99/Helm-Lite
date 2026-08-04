"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const pill =
  "font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors rounded-lg px-3.5 py-2";
const on = "bg-amber-600 text-[#140d05]";
const off =
  "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]";
const dateInput =
  "rounded-lg border border-[var(--border-strong)] bg-[var(--field)] px-2.5 py-1.5 text-[12.5px] text-[var(--text)] outline-none [color-scheme:light] dark:[color-scheme:dark]";

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthTitle(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Window (Day/Week/Month) OR a custom From–To range, plus agent — all via URL.
export function SummaryFilter({
  win,
  month,
  from,
  to,
  custom,
  agent,
  agents,
  floor,
}: {
  win: string;
  month: string;
  from: string;
  to: string;
  custom: boolean;
  agent?: string;
  agents: { id: string; full_name: string }[];
  floor: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const [f, setF] = useState(from || "");
  const [t, setT] = useState(to || "");

  function go(patch: Record<string, string>) {
    const p = new URLSearchParams(sp.toString());
    p.set("view", "summary");
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${path}?${p.toString()}`, { scroll: false });
  }

  const windows: [string, string][] = [
    ["day", "Day"],
    ["week", "Week"],
    ["month", "Month"],
  ];
  const monthOn = !custom && win === "month";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* presets — clear any custom range */}
      <div className="flex gap-1">
        {windows.map(([w, label]) => (
          <button
            key={w}
            type="button"
            onClick={() =>
              go(
                w === "month"
                  ? { win: "month", month, from: "", to: "" }
                  : { win: w, month: "", from: "", to: "" }
              )
            }
            className={pill + " " + (!custom && win === w ? on : off)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month stepper — only when Month is the active window */}
      {monthOn && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              go({ win: "month", month: shiftMonth(month, -1), from: "", to: "" })
            }
            className={pill + " " + off}
          >
            ‹
          </button>
          <span className="min-w-32 text-center font-mono text-[11px] tracking-[0.04em] text-[var(--text)]">
            {monthTitle(month)}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              go({ win: "month", month: shiftMonth(month, 1), from: "", to: "" })
            }
            className={pill + " " + off}
          >
            ›
          </button>
        </div>
      )}

      {/* custom range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={f}
          max={t || undefined}
          onChange={(e) => setF(e.target.value)}
          className={dateInput}
        />
        <span className="text-[var(--text-faint)]">→</span>
        <input
          type="date"
          value={t}
          min={f || undefined}
          onChange={(e) => setT(e.target.value)}
          className={dateInput}
        />
        <button
          type="button"
          disabled={!f || !t || f > t}
          onClick={() => go({ from: f, to: t })}
          className={pill + " " + (custom ? on : off) + " disabled:opacity-40"}
        >
          Apply
        </button>
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
