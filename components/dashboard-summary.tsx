import { Card, Avatar } from "@/components/ui";
import { SummaryFilter } from "@/components/summary-filter";

export type Metric = {
  key: string;
  label: string;
  value: string;
  delta: string;
  dir: "up" | "down" | "flat";
  spark: number[];
};
export type LeaderRow = { id: string; name: string; leads: number; deals: number };
export type HealthSeg = { label: string; count: number; color: string };

function Sparkline({ data }: { data: number[] }) {
  const w = 92;
  const h = 32;
  const p = 3;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const r = max - min || 1;
  const st = (w - p * 2) / Math.max(data.length - 1, 1);
  const pts = data.map(
    (v, i) => [p + i * st, h - p - ((v - min) / r) * (h - p * 2)] as const
  );
  const line = pts
    .map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1))
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${h - p} L ${pts[0][0].toFixed(1)} ${h - p} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={area} fill="var(--accent-soft)" />
      <path
        d={line}
        fill="none"
        stroke="#e87000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.3" fill="#e87000" />
    </svg>
  );
}

const eyebrow =
  "font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]";

export function DashboardSummary({
  win,
  agent,
  agents,
  floor,
  owner,
  metrics,
  cmpLabel,
  leaderboard,
  money,
  health,
}: {
  win: string;
  agent?: string;
  agents: { id: string; full_name: string }[];
  floor: boolean;
  owner: boolean;
  metrics: Metric[];
  cmpLabel: string;
  leaderboard: LeaderRow[];
  money: { revenue: string; deals: number; expenses: string | null };
  health: HealthSeg[];
}) {
  const maxLead = Math.max(1, ...leaderboard.map((a) => a.leads));
  const healthTotal = health.reduce((s, h) => s + h.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <SummaryFilter win={win} agent={agent} agents={agents} floor={floor} />

      {/* Momentum */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.key} className="bg-[var(--surface)] px-5 py-4">
            <p className={eyebrow}>{m.label}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="font-mono text-[23px] font-medium tabular-nums tracking-tight text-[var(--text)]">
                {m.value}
              </p>
              <Sparkline data={m.spark} />
            </div>
            <p
              className={
                "mt-2 font-mono text-[10px] tabular-nums " +
                (m.dir === "up"
                  ? "text-[#5fae7d] dark:text-[#7fb08a]"
                  : m.dir === "down"
                    ? "text-[var(--negative)]"
                    : "text-[var(--text-faint)]")
              }
            >
              {m.delta}
              <span className="ml-1.5 text-[var(--text-faint)]">{cmpLabel}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Agents + money */}
      <div className="grid gap-6 lg:grid-cols-2">
        {floor && (
          <Card
            title="Agents"
            action={
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                by leads
              </span>
            }
            padded={false}
          >
            {leaderboard.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No activity in this window.
              </p>
            ) : (
              leaderboard.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[minmax(88px,120px)_1fr_auto] items-center gap-3 border-t border-[var(--border)] px-5 py-3 first:border-t-0"
                >
                  <span className="flex items-center gap-2 truncate text-sm text-[var(--text)]">
                    <Avatar name={a.name} size={7} />
                    {a.name}
                  </span>
                  <span className="h-2 overflow-hidden rounded bg-[var(--border)]">
                    <span
                      className="block h-full rounded bg-amber-600"
                      style={{ width: `${Math.max((a.leads / maxLead) * 100, a.leads > 0 ? 3 : 0)}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs tabular-nums">
                    <span className="text-[var(--text)]">{a.leads}</span>
                    <span className="text-[var(--text-faint)]"> · {a.deals}✓</span>
                  </span>
                </div>
              ))
            )}
          </Card>
        )}

        <Card title="Money" padded={false}>
          <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
            <div className="px-5 py-4">
              <p className={eyebrow}>Revenue</p>
              <p className="mt-2 font-mono text-[20px] font-medium tabular-nums text-[var(--text)]">
                {money.revenue}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className={eyebrow}>Deals</p>
              <p className="mt-2 font-mono text-[20px] font-medium tabular-nums text-[var(--text)]">
                {money.deals}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className={eyebrow}>Expenses · mo</p>
              <p className="mt-2 font-mono text-[20px] font-medium tabular-nums text-[var(--text)]">
                {money.expenses ?? "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Account health (owner) */}
      {owner && healthTotal > 0 && (
        <Card
          title="Account health"
          action={
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {healthTotal} accounts
            </span>
          }
        >
          <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded">
            {health.map((h) => (
              <span
                key={h.label}
                style={{ flex: h.count, backgroundColor: h.color }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {health.map((h) => (
              <span
                key={h.label}
                className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)]"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: h.color }}
                />
                {h.label} {h.count}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
