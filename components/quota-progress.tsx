import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { QuotaBar } from "@/components/quota-bar";
import { MonthNav } from "@/components/month-nav";
import { workingDaysInMonth } from "@/lib/dates";
import { monthMeta } from "@/lib/attendance";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";
import { dailyTarget, type DailyTarget } from "@/lib/quota";

// Each person's own whole-month progress: a leads quota bar (30 x the month's
// working days — Mon–Sat, present or absent) and a sales target bar ($2000,
// filled only from revenue received).
export async function QuotaProgress({
  userId,
  month,
}: {
  userId: string;
  month?: string;
}) {
  const supabase = await createClient();
  const M = monthMeta(month);
  const from = M.first;
  const to = M.last;
  const workingDays = workingDaysInMonth(from, to);

  const [{ data: leadDays }, { data: deals }] = await Promise.all(
    [
      supabase
        .from("activity_leads_added")
        .select("day, n")
        .eq("agent_id", userId)
        .gte("day", from)
        .lte("day", to)
        .limit(100000),
      // Sales credit follows the money: each payment counts in the month it
      // was paid, whenever the sale itself closed.
      supabase
        .from("deal_payments")
        .select("amount")
        .eq("agent_id", userId)
        .gte("paid_on", from)
        .lte("paid_on", to)
        .limit(100000),
    ]
  );

  // Whole-month quota from the calendar: every working day (Mon–Sat) counts,
  // whether the agent was present or absent.
  const leadsTarget = DAILY_LEAD_QUOTA * workingDays;
  const byDay = new Map<string, number>();
  for (const r of (leadDays ?? []) as { day: string; n: number }[])
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + (r.n ?? 0));
  const leadsDone = [...byDay.values()].reduce((s, n) => s + n, 0);
  const today = dailyTarget(leadsTarget, byDay, from, to);
  const salesDone = ((deals ?? []) as { amount: number }[]).reduce(
    (s, r) => s + Number(r.amount ?? 0),
    0
  );

  const leadsHit = leadsTarget > 0 && leadsDone >= leadsTarget;
  const salesHit = salesDone >= MONTHLY_SALES_TARGET;

  return (
    <Card
      title={`Your targets · ${M.label}`}
      action={<MonthNav prev={M.prev} next={M.next} />}
    >
      <div className="flex flex-col gap-3.5">
        {today && <TodayTarget t={today} />}
        <QuotaBar
          label="Leads quota"
          hint={
            leadsHit
              ? "🔥 Quota smashed — keep stacking!"
              : `${DAILY_LEAD_QUOTA}/day × ${workingDays} working days (Mon–Sat)`
          }
          current={leadsDone}
          target={leadsTarget}
          display={(n) => n.toLocaleString()}
          color="#d97706"
        />
        <QuotaBar
          label="Sales target"
          hint={
            salesHit
              ? "💰 Target hit — nice work!"
              : "Fills from revenue received — not deal size."
          }
          current={salesDone}
          target={MONTHLY_SALES_TARGET}
          display={(n) => "$" + n.toLocaleString()}
          color="#9333ea"
        />
      </div>
    </Card>
  );
}

// Today's catch-up target: the month's remaining quota spread over the working
// days left, so missed or absent days are made up and the month still lands.
function TodayTarget({ t }: { t: DailyTarget }) {
  const left = Math.max(0, t.target - t.doneToday);
  const extra = t.target - DAILY_LEAD_QUOTA;
  return (
    <div className="rounded-lg border border-amber-600/40 bg-[var(--accent-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">
          {t.sunday ? "Next working day's target" : "Today's target"}:{" "}
          <span className="font-mono text-amber-600">{t.target} leads</span>
        </p>
        {!t.sunday && (
          <p className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
            {t.doneToday} done ·{" "}
            {left > 0 ? `${left} to go` : "done for today ✓"}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {extra > 0
          ? `${DAILY_LEAD_QUOTA} + ${extra} to catch up on missed days, so the month's quota is still reached.`
          : extra < 0
            ? `Ahead of pace, so today needs ${-extra} fewer than the usual ${DAILY_LEAD_QUOTA}.`
            : "On pace for the month."}
      </p>
    </div>
  );
}
