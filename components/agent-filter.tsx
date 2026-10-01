"use client";

import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

// Owner's agent filter for the attendance sheet. Navigates on change, keeping
// the current month and marking date. A dropdown stays tidy as the team grows.
export function AgentFilter({
  people,
  value,
  month,
  date,
}: {
  people: { id: string; full_name: string }[];
  value: string;
  month?: string;
  date?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => {
        const sp = new URLSearchParams();
        if (month) sp.set("month", month);
        if (date) sp.set("date", date);
        if (e.target.value) sp.set("agent", e.target.value);
        const s = sp.toString();
        router.push(s ? `/attendance?${s}` : "/attendance");
      }}
      className={inputClass + " max-w-60"}
      aria-label="Filter by agent"
    >
      <option value="">Everyone</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name}
        </option>
      ))}
    </select>
  );
}
