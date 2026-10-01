import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { QuotaBar } from "@/components/quota-bar";
import { monthRange } from "@/lib/dates";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";

// Each person's own whole-month progress: a leads quota bar (30 x the month's
// days, minus their absences) and a sales target bar ($2000, filled only from
// revenue received).
export async function QuotaProgress({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { from, to } = monthRange();
  const daysInMonth = Number(to.slice(8, 10));

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

  // Whole-month quota: every day counts except days marked Absent.
  const absentDays = ((att ?? []) as { status: string }[]).filter(
    (r) => r.status === "absent"
  ).length;
  const quotaDays = Math.max(0, daysInMonth - absentDays);
  const leadsTarget = DAILY_LEAD_QUOTA * quotaDays;
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
        <QuotaBar
          label="Leads quota"
          hint={`${DAILY_LEAD_QUOTA}/day × ${quotaDays} days this month${
            absentDays ? ` (${absentDays} absent excluded)` : ""
          }`}
          current={leadsDone}
          target={leadsTarget}
          display={(n) => n.toLocaleString()}
          color="#d97706"
        />
        <QuotaBar
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
