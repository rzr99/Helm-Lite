import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { QuotaBar } from "@/components/quota-bar";
import { MonthNav } from "@/components/month-nav";
import { workingDaysInMonth, isSunday } from "@/lib/dates";
import { monthMeta } from "@/lib/attendance";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";

// Each person's own whole-month progress: a leads quota bar (30 x the month's
// working days — Mon–Sat, minus their absences) and a sales target bar ($2000,
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

  const [{ data: att }, { data: leadDays }, { data: deals }] = await Promise.all(
    [
      supabase
        .from("attendance")
        .select("status, date")
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

  // Whole-month quota: every working day (Mon–Sat) counts except days marked
  // Absent. A Sunday absence is ignored — Sundays never count anyway.
  const absentDays = ((att ?? []) as { status: string; date: string }[]).filter(
    (r) => r.status === "absent" && !isSunday(r.date)
  ).length;
  const quotaDays = Math.max(0, workingDays - absentDays);
  const leadsTarget = DAILY_LEAD_QUOTA * quotaDays;
  const leadsDone = ((leadDays ?? []) as { n: number }[]).reduce(
    (s, r) => s + (r.n ?? 0),
    0
  );
  const salesDone = ((deals ?? []) as { revenue_received: number }[]).reduce(
    (s, r) => s + Number(r.revenue_received ?? 0),
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
        <QuotaBar
          label="Leads quota"
          hint={
            leadsHit
              ? "🔥 Quota smashed — keep stacking!"
              : `${DAILY_LEAD_QUOTA}/day × ${quotaDays} working days (excl. Sundays)${
                  absentDays ? ` − ${absentDays} absent` : ""
                }`
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
