import { Card } from "@/components/ui";

type FloorRow = {
  id: string;
  name: string;
  leads: number;
  followUps: number;
  deals: number;
};
type DayRow = { day: string; leads: number; followUps: number; deals: number };

const figLegend = (
  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)]">
    leads · follow-ups · closed
  </span>
);

// Floor comparison: one amber bar per agent (leads added), with the three
// figures direct-labelled. Single series — no legend box needed, the title says it.
export function FloorCompare({ series }: { series: FloorRow[] }) {
  const max = Math.max(1, ...series.map((a) => a.leads));
  return (
    <Card
      title="Floor comparison"
      description="Leads added per agent this period."
      action={figLegend}
      padded={false}
    >
      {series.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          No activity in this period.
        </p>
      ) : (
        series.map((a) => (
          <div
            key={a.id}
            title={`${a.name} — ${a.leads} leads · ${a.followUps} follow-ups · ${a.deals} closed`}
            className="grid grid-cols-[minmax(84px,120px)_1fr_auto] items-center gap-4 border-t border-[var(--border)] px-5 py-3 first:border-t-0"
          >
            <span className="truncate text-sm text-[var(--text)]">{a.name}</span>
            <span className="h-2 overflow-hidden rounded bg-[var(--border)]">
              <span
                className="block h-full rounded bg-amber-600"
                style={{ width: `${Math.max((a.leads / max) * 100, a.leads > 0 ? 3 : 0)}%` }}
              />
            </span>
            <span className="font-mono text-xs tabular-nums">
              <span className="text-[var(--text)]">{a.leads}</span>
              <span className="text-[var(--text-faint)]">
                {" · "}
                {a.followUps} · {a.deals}
              </span>
            </span>
          </div>
        ))
      )}
    </Card>
  );
}

// One agent's daily output across the range — a trend/diagnosis.
export function AgentTrend({
  name,
  days,
}: {
  name: string;
  days: DayRow[];
}) {
  const max = Math.max(1, ...days.map((d) => d.leads));
  const total = days.reduce((s, d) => s + d.leads, 0);
  return (
    <Card
      title={`${name} · daily output`}
      description={`${total} lead${total === 1 ? "" : "s"} added over ${days.length} day${days.length === 1 ? "" : "s"}.`}
      action={figLegend}
    >
      <div className="flex items-stretch gap-1.5">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day} — ${d.leads} leads · ${d.followUps} follow-ups · ${d.deals} closed`}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-40 w-full items-end">
              <div
                className="w-full rounded-t bg-amber-600"
                style={{
                  height: `${(d.leads / max) * 100}%`,
                  minHeight: d.leads > 0 ? 3 : 0,
                }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-[var(--text-faint)]">
              {d.day.slice(8)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
