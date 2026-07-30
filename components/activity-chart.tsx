import { Card } from "@/components/ui";

type DayRow = { day: string; leads: number; followUps: number; deals: number };

const H = 180; // chart plot height (px)

const series = [
  { key: "leads" as const, label: "Leads", fill: "bg-amber-600", top: true },
  { key: "followUps" as const, label: "Follow-ups", fill: "bg-[var(--text-faint)]", top: false },
  { key: "deals" as const, label: "Closed", fill: "bg-[var(--border-strong)]", top: false },
];

function Legend({ items }: { items: typeof series }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((s) => (
        <span
          key={s.key}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]"
        >
          <span className={"h-2 w-2 rounded-sm " + s.fill} />
          {s.label}
        </span>
      ))}
    </span>
  );
}

// Stacked activity over time — one bar per day in the range, split into
// leads / follow-ups / closed. Single accent + two greys, so it stays on-brand.
export function ActivityTimeline({
  days,
  subject,
  focus,
}: {
  days: DayRow[];
  subject: string;
  focus?: "leads" | "followUps" | "deals";
}) {
  // When one metric is in focus, show only it — as a single amber series.
  const shown = focus
    ? series
        .filter((s) => s.key === focus)
        .map((s) => ({ ...s, fill: "bg-amber-600", top: true }))
    : series;
  const max = Math.max(
    1,
    ...days.map((d) => shown.reduce((sum, s) => sum + d[s.key], 0))
  );
  const dense = days.length > 16;
  const step = Math.max(1, Math.ceil(days.length / 8));
  const hasActivity = days.some((d) => d.leads + d.followUps + d.deals > 0);

  return (
    <Card title="Activity over time" description={subject} action={<Legend items={shown} />}>
      {!hasActivity ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          No activity in this period.
        </p>
      ) : (
        <div className="relative pl-7" style={{ height: H + 22 }}>
          {/* y grid + max label */}
          {[0, 0.5, 1].map((f) => (
            <span
              key={f}
              className="pointer-events-none absolute left-7 right-0 h-px bg-[var(--border)]"
              style={{ top: f * H }}
            />
          ))}
          <span
            className="absolute left-0 font-mono text-[9px] tabular-nums text-[var(--text-faint)]"
            style={{ top: -3 }}
          >
            {max}
          </span>
          <span
            className="absolute left-0 font-mono text-[9px] tabular-nums text-[var(--text-faint)]"
            style={{ top: H - 6 }}
          >
            0
          </span>

          {/* bars */}
          <div className="flex items-end gap-1.5" style={{ height: H }}>
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day} — ${d.leads} leads · ${d.followUps} follow-ups · ${d.deals} closed`}
                className="flex min-w-0 flex-1 flex-col justify-end gap-0.5"
                style={{ height: H }}
              >
                {shown.map((s) => {
                  const v = d[s.key];
                  if (v <= 0) return null;
                  return (
                    <div
                      key={s.key}
                      className={s.fill + (s.top ? " rounded-t-[3px]" : "")}
                      style={{ height: `${(v / max) * H}px` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* x labels */}
          <div className="mt-1.5 flex gap-1.5">
            {days.map((d, i) => (
              <span
                key={d.day}
                className="min-w-0 flex-1 truncate text-center font-mono text-[9px] tabular-nums text-[var(--text-faint)]"
              >
                {!dense || i % step === 0 ? d.day.slice(8) : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
