import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { monthRange } from "@/lib/dates";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";

function Bar({
  label,
  hint,
  current,
  target,
  display,
  color,
}: {
  label: string;
  hint: string;
  current: number;
  target: number;
  display: (n: number) => string;
  color: string;
}) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const width = Math.min(100, Math.max(current > 0 ? 3 : 0, pct));
  const done = target > 0 && current >= target;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-semibold text-[var(--text)]">{label}</span>
        <span className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)]">{display(current)}</span>{" "}
          / {target > 0 ? display(target) : "—"}
          {target > 0 && (
            <span
              className="ml-1.5 font-semibold"
              style={{ color: done ? "#16a34a" : color }}
            >
              {pct}%
            </span>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--sunken)] ring-1 ring-inset ring-[var(--border-soft)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: done ? "#16a34a" : color }}
        />
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">{hint}</p>
    </div>
  );
}

// Each person's own month-to-date progress: a leads quota bar (30 x attended
// days) and a sales target bar ($2000, filled only from revenue received).
export async function QuotaProgress({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { from, to } = monthRange();

  const [{ data: att }, { data: leadDays }, { data: deals }] = await Promise.all(
    [
      supabase
        .from("attendance")
        .select("status")
        .eq("user_id", userId)
        .gte("date", from)
        .lte("date", to)
        .limit(100000),
      supabase
        .from("activity_leads_added")
        .select("n")
        .eq("agent_id", userId)
        .gte("day", from)
        .lte("day", to)
        .limit(100000),
      supabase
        .from("deals")
        .select("revenue_received")
        .eq("agent_id", userId)
        .gte("date_closed", from)
        .lte("date_closed", to)
        .limit(100000),
    ]
  );

  // Every attended day counts (present / late / half-day); only absent doesn't.
  const attendedDays = ((att ?? []) as { status: string }[]).filter(
    (r) => r.status !== "absent"
  ).length;
  const leadsTarget = DAILY_LEAD_QUOTA * attendedDays;
  const leadsDone = ((leadDays ?? []) as { n: number }[]).reduce(
    (s, r) => s + (r.n ?? 0),
    0
  );
  const salesDone = ((deals ?? []) as { revenue_received: number }[]).reduce(
    (s, r) => s + Number(r.revenue_received ?? 0),
    0
  );

  const monthLabel = new Date(from + "T00:00:00").toLocaleString("en-US", {
    month: "long",
  });

  return (
    <Card title={`Your targets · ${monthLabel}`}>
      <div className="flex flex-col gap-5">
        <Bar
          label="Leads quota"
          hint={
            attendedDays > 0
              ? `${DAILY_LEAD_QUOTA}/day × ${attendedDays} attended day${attendedDays === 1 ? "" : "s"} so far`
              : "No attendance marked yet this month."
          }
          current={leadsDone}
          target={leadsTarget}
          display={(n) => n.toLocaleString()}
          color="#d97706"
        />
        <Bar
          label="Sales target"
          hint="Fills from revenue received — not deal size."
          current={salesDone}
          target={MONTHLY_SALES_TARGET}
          display={(n) => "$" + n.toLocaleString()}
          color="#9333ea"
        />
      </div>
    </Card>
  );
}
